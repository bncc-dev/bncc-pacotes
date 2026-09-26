/**
 * Busca com ranking do @bncc/dados, sem dados embutidos (DECISOES.md D10).
 *
 * Funções puras, sem sistema de arquivos e sem JSON: podem rodar no navegador.
 * O `buscar()` do pacote usa exatamente estas funções sobre o índice que monta
 * dos dados; interfaces web (ex.: bncc.dev) montam o mesmo índice a partir de
 * `indiceBusca()` serializado e obtêm a mesma ordem e a mesma pontuação.
 *
 * Espelho em Python: `python/bncc/_busca.py`.
 */

/** Normalização para busca textual: minúsculas, sem acentos, espaços únicos. */
export function normalizarTexto(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Normalização de consulta: normalizarTexto + pontuação vira espaço. */
export function normalizarBusca(t: string): string {
  return normalizarTexto(t.replace(/[.,;:!?()"'«»“”‘’\[\]/-]/g, ' '));
}

/**
 * Palavras vazias do português ignoradas pela busca. Lista fixa e curta,
 * idêntica à do pacote Python; uma consulta só de palavras vazias devolve vazio.
 */
export const STOPWORDS: ReadonlySet<string> = new Set(
  'de a o e em para da do das dos na no nas nos com por um uma uns umas as os que ao aos se sua suas seu seus ou como sobre entre etc pelo pela pelos pelas'.split(' '),
);

const RADICAL_PLURAL: ReadonlyArray<[string, string]> = [
  ['coes', 'cao'], ['oes', 'ao'], ['aes', 'ao'], ['ais', 'al'], ['eis', 'el'], ['ois', 'ol'],
  ['is', 'il'], ['ns', 'm'], ['res', 'r'], ['zes', 'z'], ['ses', 's'], ['s', ''],
];
const RADICAL_FORTE: ReadonlyArray<[string, string]> = [['mente', ''], ['cao', 'c'], ['ao', '']];
const RADICAL_DERIVACIONAL: ReadonlyArray<[string, string]> = [['cionari', 'c'], ['cional', 'c'], ['idad', ''], ['ment', '']];

function trocarSufixo(w: string, regras: ReadonlyArray<[string, string]>): string | undefined {
  for (const [suf, rep] of regras) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) return w.slice(0, -suf.length) + rep;
  }
  return undefined;
}

/**
 * Radical de uma palavra já normalizada (sem acento, minúscula), por regras
 * curtas de plural, gênero e sufixos frequentes do português. Não é um stemmer
 * completo: o objetivo é `fracao`, `fracoes` e `fracionario` caírem no mesmo
 * radical sem que `texto` case `contexto`. Regras e colisões aceitas em
 * DECISOES.md D10. Idêntica à função `radical` do pacote Python.
 */
export function radical(palavra: string): string {
  let w = palavra;
  if (w.length <= 3) return w;
  w = trocarSufixo(w, RADICAL_PLURAL) ?? w;
  const forte = trocarSufixo(w, RADICAL_FORTE);
  if (forte !== undefined) return forte;
  if (w.length >= 5 && 'aoe'.includes(w[w.length - 1])) w = w.slice(0, -1);
  return trocarSufixo(w, RADICAL_DERIVACIONAL) ?? w;
}

/** Tokens de busca de um texto: normalizado, sem palavras vazias, por radical. */
export function tokenizar(texto: string): string[] {
  return normalizarBusca(texto).split(' ').filter((w) => w && !STOPWORDS.has(w)).map(radical);
}

// Parâmetros do BM25 (DECISOES.md D10). Os mesmos no pacote Python.
const BM25_K1 = 1.2;
const BM25_B = 0.75;
const PESO_CAMPOS = 0.5;

/**
 * Uma aprendizagem no índice de busca, na forma serializável que
 * `indiceBusca()` devolve: radicais do enunciado (`k`) e dos campos
 * estruturais (`kc`), separados por espaço, na ordem em que aparecem.
 */
export interface EntradaIndiceBusca {
  codigo: string;
  texto: string;
  k: string;
  kc: string;
}

interface DocPreparado {
  codigo: string;
  textoNorm: string;
  enunciado: Map<string, number>;
  campos: Map<string, number>;
  tamanho: number;
}

/** Índice pronto para `ranquear`; monte com `prepararIndice`. */
export interface IndicePreparado {
  readonly docs: ReadonlyArray<DocPreparado>;
  readonly df: ReadonlyMap<string, number>;
  readonly tamanhoMedio: number;
}

function separar(radicais: string): string[] {
  return radicais ? radicais.split(' ') : [];
}

function contar(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/**
 * Prepara o índice para `ranquear`: frequências por aprendizagem, frequência
 * de documento de cada radical e tamanho médio. A ordem das entradas é a
 * ordem dos índices (`i`) devolvidos por `ranquear`.
 */
export function prepararIndice(entradas: ReadonlyArray<EntradaIndiceBusca>): IndicePreparado {
  const df = new Map<string, number>();
  let soma = 0;
  const docs = entradas.map((e) => {
    const te = separar(e.k);
    const tc = separar(e.kc);
    const doc: DocPreparado = {
      codigo: e.codigo,
      textoNorm: normalizarBusca(e.texto),
      enunciado: contar(te),
      campos: contar(tc),
      tamanho: te.length + tc.length,
    };
    soma += doc.tamanho;
    for (const t of new Set([...te, ...tc])) df.set(t, (df.get(t) ?? 0) + 1);
    return doc;
  });
  return { docs, df, tamanhoMedio: docs.length ? soma / docs.length : 0 };
}

/** Um resultado de `ranquear`: posição da entrada no índice e relevância (3 casas). */
export interface Ranqueado { i: number; pontuacao: number }

/**
 * Ranking determinístico (issue #14). A consulta é reduzida a radicais sem
 * palavras vazias; a pontuação é BM25 sobre o enunciado mais os campos
 * estruturais (peso 0,5). Estratos: enunciado idêntico à consulta; todos os
 * radicais e o trecho literal; todos os radicais; parte dos radicais, só
 * quando os anteriores estão vazios. Dentro de cada estrato, pontuação
 * decrescente e empate por código. `aceitar` filtra entradas pela posição
 * (filtros de etapa, componente, ano...) sem mudar a pontuação das demais.
 */
export function ranquear(indice: IndicePreparado, consulta: string, aceitar?: (i: number) => boolean): Ranqueado[] {
  const alvo = normalizarBusca(consulta);
  const termos = [...new Set(tokenizar(consulta))];
  if (termos.length === 0) return [];
  const { docs, df, tamanhoMedio } = indice;
  const n = docs.length;
  type Pontuado = { i: number; codigo: string; casados: number; exato: boolean; literal: boolean; pontuacao: number };
  const pontuados: Pontuado[] = [];
  for (let i = 0; i < docs.length; i++) {
    if (aceitar && !aceitar(i)) continue;
    const doc = docs[i];
    let casados = 0;
    let s = 0;
    for (const t of termos) {
      const f = (doc.enunciado.get(t) ?? 0) + PESO_CAMPOS * (doc.campos.get(t) ?? 0);
      if (f === 0) continue;
      casados += 1;
      const d = df.get(t) ?? 0;
      const idf = Math.log(1 + (n - d + 0.5) / (d + 0.5));
      s += idf * (f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + BM25_B * doc.tamanho / tamanhoMedio));
    }
    if (casados === 0) continue;
    // O trecho literal só distingue consultas de duas ou mais palavras; com
    // uma só, ele reintroduziria a diferença singular/plural que o radical
    // acabou de apagar.
    const literal = termos.length >= 2 && doc.textoNorm.includes(alvo);
    // Enunciado idêntico à consulta vem antes dos que apenas a contêm: um
    // texto mais longo que inclui a consulta pode pontuar mais no BM25.
    const exato = doc.textoNorm === alvo;
    pontuados.push({ i, codigo: doc.codigo, casados, exato, literal, pontuacao: Math.round(s * 1000) / 1000 });
  }
  const porRelevancia = (a: Pontuado, b: Pontuado) => b.pontuacao - a.pontuacao || (a.codigo < b.codigo ? -1 : 1);
  const todos = pontuados.filter((p) => p.casados === termos.length);
  const exatos = todos.filter((p) => p.exato).sort(porRelevancia);
  const estratoA = todos.filter((p) => p.literal && !p.exato).sort(porRelevancia);
  const estratoB = todos.filter((p) => !p.literal && !p.exato).sort(porRelevancia);
  const escolhidos = todos.length > 0 ? [...exatos, ...estratoA, ...estratoB] : pontuados.sort(porRelevancia);
  return escolhidos.map((p) => ({ i: p.i, pontuacao: p.pontuacao }));
}

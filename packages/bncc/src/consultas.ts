/**
 * API de consulta em português — a superfície pública do pacote.
 *
 * Casca fina sobre o núcleo injetável (nucleo.ts): carrega os JSONs embutidos
 * do disco (lazy, uma vez) e delega. Runtimes sem fs usam `@bncc/dados/nucleo`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { criarConsultas, type Consultas, type DadosBNCC } from './nucleo.js';
import type { AprendizagemResolvida } from './tipos.js';

export type { FiltroEF, FiltroEM, FiltroEI, FiltroBusca } from './nucleo.js';
import type { FiltroEF, FiltroEM, FiltroEI, FiltroBusca } from './nucleo.js';

const DADOS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dados');

let cache: Consultas | null = null;

function consultas(): Consultas {
  if (cache) return cache;
  const carregar = <T>(arquivo: string): T => JSON.parse(readFileSync(join(DADOS_DIR, arquivo), 'utf8')) as T;
  const dados: DadosBNCC = {
    estrutura: carregar('estrutura.json'),
    educacaoInfantil: carregar('educacao-infantil.json'),
    ensinoFundamental: carregar('ensino-fundamental.json'),
    ensinoMedio: carregar('ensino-medio.json'),
    // Complemento de Computação (Parecer CNE/CEB 2/2022), incluído por padrão
    // desde a 0.3.0: total passa a 1.721 aprendizagens.
    computacao: carregar('computacao.json'),
  };
  cache = criarConsultas(dados);
  return cache;
}

/** Registro completo de uma aprendizagem pelo código (case-insensitive), com nomes resolvidos. */
export function porCodigo(codigo: string): AprendizagemResolvida {
  return consultas().porCodigo(codigo);
}

/** Habilidades do Ensino Fundamental, com filtros opcionais. Aceita id (`ef-comp-lp`) ou sigla (`LP`). */
export function habilidadesEF(filtro: FiltroEF = {}): AprendizagemResolvida[] {
  return consultas().habilidadesEF(filtro);
}

/** Habilidades do Ensino Médio. `area` aceita id (`em-area-lgg`) ou sigla (`LGG`). */
export function habilidadesEM(filtro: FiltroEM = {}): AprendizagemResolvida[] {
  return consultas().habilidadesEM(filtro);
}

/** Objetivos da Educação Infantil. `campo` aceita id (`ei-campo-ts`) ou sigla (`TS`). */
export function objetivosEI(filtro: FiltroEI = {}): AprendizagemResolvida[] {
  return consultas().objetivosEI(filtro);
}

/** Busca textual normalizada (sem acentos/caixa) nos enunciados. Sem rede, sem índice externo. */
export function buscar(texto: string, filtro: FiltroBusca = {}): AprendizagemResolvida[] {
  return consultas().buscar(texto, filtro);
}

/** A espinha estrutural completa (etapas, áreas, componentes, competências, recortes). */
export function estrutura() {
  return consultas().estrutura();
}

/** Progressão oficial da EI: os objetivos do mesmo aspecto nas três faixas etárias. */
export function progressaoEI(codigo: string): { alinhamento: string; objetivos: AprendizagemResolvida[]; nota?: string } {
  return consultas().progressaoEI(codigo);
}

/** Contagens do dataset (para sanidade e exibição). */
export function estatisticas() {
  return consultas().estatisticas();
}

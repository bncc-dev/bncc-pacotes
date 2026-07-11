/**
 * Geração dos CSVs de listagem no build. Este canal é para gente (professor
 * no Excel/Sheets): as colunas de referência vêm resolvidas por extenso
 * (área, componente, competências, unidades, campos, objetos). Quem precisa
 * dos ids crus normalizados usa os derivados do bncc-dados (derivados/csv/).
 *
 * Os dados crus vêm dos JSONs do próprio pacote (subpath ./dados), não de
 * arquivos locais: continua valendo a regra de que todo dado passa pelo
 * @bncc/dados.
 */
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);

interface Fonte { localizador?: string; localizador_pdf?: string }
interface RegistroCru {
  codigo: string;
  texto: string;
  vigencia: { status: string };
  fonte: Fonte;
  [k: string]: unknown;
}

const ef = require_('@bncc/dados/dados/ensino-fundamental.json') as { habilidades: RegistroCru[]; contextos_organizacao: Array<{ id: string; nome: string }> };
const em = require_('@bncc/dados/dados/ensino-medio.json') as { habilidades: RegistroCru[]; contextos_organizacao: Array<{ id: string; nome: string }> };
const ei = require_('@bncc/dados/dados/educacao-infantil.json') as { objetivos: RegistroCru[] };
const est = require_('@bncc/dados/dados/estrutura.json') as Record<string, Array<Record<string, unknown>>>;

const SEP = ' | ';

// id → texto por extenso, para todas as entidades referenciadas nas colunas
const NOMES = new Map<string, string>();
for (const grupo of ['areas_conhecimento', 'componentes_curriculares', 'campos_experiencias']) {
  for (const item of est[grupo]) NOMES.set(item.id as string, item.nome as string);
}
for (const r of est.recortes_temporais) {
  if (r.nome) NOMES.set(r.id as string, `${r.nome}${r.faixa ? ` (${r.faixa})` : ''}`);
}
for (const c of est.competencias_especificas) {
  NOMES.set(c.id as string, `${c.numero}. ${c.texto}`);
}
for (const ctx of [...ef.contextos_organizacao, ...em.contextos_organizacao]) {
  NOMES.set(ctx.id, ctx.nome);
}

function porExtenso(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map((v) => NOMES.get(v as string) ?? v);
  if (typeof valor === 'string') return NOMES.get(valor) ?? valor;
  return valor;
}

function celula(valor: unknown): string {
  if (valor === undefined || valor === null) return '';
  const texto = Array.isArray(valor) ? valor.join(SEP) : String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function linhas(colunas: string[], registros: Array<Record<string, unknown>>): string {
  const corpo = registros.map((r) => colunas.map((c) => celula(r[c])).join(','));
  return [colunas.join(','), ...corpo].join('\n') + '\n';
}

// Colunas idênticas às de derivados/csv/*.csv do bncc-dados.
const COLUNAS_EF = ['codigo', 'componente', 'anos', 'organizacao_tipo', 'unidade_tematica', 'campos_atuacao', 'pratica_linguagem', 'eixo', 'objetos_conhecimento', 'texto', 'vigencia_status', 'fonte_localizador', 'fonte_localizador_pdf'];
const COLUNAS_EM = ['codigo', 'area', 'componente', 'competencias_especificas', 'campos_atuacao_social', 'texto', 'vigencia_status', 'fonte_localizador', 'fonte_localizador_pdf'];
const COLUNAS_EI = ['codigo', 'campo_experiencias', 'grupo_etario', 'alinhamento', 'texto', 'vigencia_status', 'fonte_localizador'];

const COLUNAS_POR_EXTENSO = new Set(['componente', 'area', 'campo_experiencias', 'grupo_etario',
  'competencias_especificas', 'unidade_tematica', 'campos_atuacao', 'campos_atuacao_social',
  'pratica_linguagem', 'eixo', 'objetos_conhecimento']);

function achatar(r: RegistroCru): Record<string, unknown> {
  const org = (r.organizacao ?? {}) as Record<string, unknown>;
  const plano: Record<string, unknown> = {
    ...r,
    organizacao_tipo: org.tipo,
    unidade_tematica: org.unidade_tematica,
    campos_atuacao: org.campos_atuacao,
    pratica_linguagem: org.pratica_linguagem,
    eixo: org.eixo,
    vigencia_status: r.vigencia.status,
    fonte_localizador: r.fonte.localizador,
    fonte_localizador_pdf: r.fonte.localizador_pdf,
  };
  for (const coluna of COLUNAS_POR_EXTENSO) {
    if (coluna in plano) plano[coluna] = porExtenso(plano[coluna]);
  }
  return plano;
}

export function csvEF(filtro: { componente?: string; ano?: number } = {}): string {
  const regs = ef.habilidades
    .filter((h) => !filtro.componente || h.componente === filtro.componente)
    .filter((h) => !filtro.ano || (h.anos as number[]).includes(filtro.ano));
  return linhas(COLUNAS_EF, regs.map(achatar));
}

export function csvEM(filtro: { area?: string } = {}): string {
  const regs = em.habilidades.filter((h) => !filtro.area || h.area === filtro.area);
  return linhas(COLUNAS_EM, regs.map(achatar));
}

export function csvEI(filtro: { campo?: string } = {}): string {
  const regs = ei.objetivos.filter((o) => !filtro.campo || o.campo_experiencias === filtro.campo);
  return linhas(COLUNAS_EI, regs.map(achatar));
}

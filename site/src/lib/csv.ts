/**
 * Geração dos CSVs de listagem no build, com as MESMAS colunas e convenções
 * dos derivados do bncc-dados (derivados/csv/): ids crus, listas com ' | ',
 * fonte em duas colunas. Consistência entre canais: quem baixa aqui e quem
 * baixa lá recebe o mesmo formato.
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

const ef = require_('@bncc/dados/dados/ensino-fundamental.json') as { habilidades: RegistroCru[] };
const em = require_('@bncc/dados/dados/ensino-medio.json') as { habilidades: RegistroCru[] };
const ei = require_('@bncc/dados/dados/educacao-infantil.json') as { objetivos: RegistroCru[] };

const SEP = ' | ';

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

function achatar(r: RegistroCru): Record<string, unknown> {
  const org = (r.organizacao ?? {}) as Record<string, unknown>;
  return {
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

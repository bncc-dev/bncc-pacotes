/**
 * Carregamento dos dados embutidos e índices em memória (lazy, uma vez).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Alinhamento, ContextoOrganizacao, Estrutura, HabilidadeEF, HabilidadeEM, ObjetivoEI } from './tipos.js';

const DADOS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dados');

export interface Indice {
  estrutura: Estrutura;
  objetivosEI: ObjetivoEI[];
  alinhamentos: Alinhamento[];
  habilidadesEF: HabilidadeEF[];
  habilidadesEM: HabilidadeEM[];
  porCodigo: Map<string, ObjetivoEI | HabilidadeEF | HabilidadeEM>;
  contextos: Map<string, ContextoOrganizacao>;
  competenciasPorId: Map<string, { id: string; numero: number; texto: string }>;
  alinhamentoPorId: Map<string, Alinhamento>;
  nomesComponentes: Map<string, string>;
  nomesAreas: Map<string, string>;
  nomesCampos: Map<string, string>;
}

let cache: Indice | null = null;

function carregar<T>(arquivo: string): T {
  return JSON.parse(readFileSync(join(DADOS_DIR, arquivo), 'utf8')) as T;
}

export function indice(): Indice {
  if (cache) return cache;

  const estrutura = carregar<Estrutura>('estrutura.json');
  const ei = carregar<{ objetivos: ObjetivoEI[]; alinhamentos: Alinhamento[] }>('educacao-infantil.json');
  const ef = carregar<{ habilidades: HabilidadeEF[]; contextos_organizacao: ContextoOrganizacao[] }>('ensino-fundamental.json');
  const em = carregar<{ habilidades: HabilidadeEM[]; contextos_organizacao: ContextoOrganizacao[] }>('ensino-medio.json');

  const porCodigo = new Map<string, ObjetivoEI | HabilidadeEF | HabilidadeEM>();
  for (const o of ei.objetivos) porCodigo.set(o.codigo, o);
  for (const h of ef.habilidades) porCodigo.set(h.codigo, h);
  for (const h of em.habilidades) porCodigo.set(h.codigo, h);

  const contextos = new Map<string, ContextoOrganizacao>();
  for (const c of [...ef.contextos_organizacao, ...em.contextos_organizacao]) contextos.set(c.id, c);

  const competenciasPorId = new Map<string, { id: string; numero: number; texto: string }>();
  for (const c of estrutura.competencias_especificas) competenciasPorId.set(c.id, c);

  const alinhamentoPorId = new Map<string, Alinhamento>();
  for (const a of ei.alinhamentos) alinhamentoPorId.set(a.id, a);

  const nomesComponentes = new Map(estrutura.componentes_curriculares.map((c) => [c.id, c.nome]));
  const nomesAreas = new Map(estrutura.areas_conhecimento.map((a) => [a.id, a.nome]));
  const nomesCampos = new Map(estrutura.campos_experiencias.map((c) => [c.id, c.nome]));

  cache = {
    estrutura,
    objetivosEI: ei.objetivos, alinhamentos: ei.alinhamentos,
    habilidadesEF: ef.habilidades, habilidadesEM: em.habilidades,
    porCodigo, contextos, competenciasPorId, alinhamentoPorId,
    nomesComponentes, nomesAreas, nomesCampos,
  };
  return cache;
}

/** Normalização para busca textual: minúsculas, sem acentos, espaços únicos. */
export function normalizarTexto(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

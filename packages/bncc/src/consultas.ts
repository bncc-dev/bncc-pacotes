/**
 * API de consulta em português — a superfície pública do pacote.
 */
import { decodificar } from './decodificar.js';
import { indice, normalizarTexto } from './indice.js';
import type { AprendizagemResolvida, HabilidadeEF, HabilidadeEM, ObjetivoEI } from './tipos.js';

function resolverNome(id: string): string {
  const i = indice();
  return i.contextos.get(id)?.nome ?? i.nomesComponentes.get(id) ?? i.nomesAreas.get(id) ?? i.nomesCampos.get(id) ?? id;
}

function resolver(reg: ObjetivoEI | HabilidadeEF | HabilidadeEM): AprendizagemResolvida {
  const i = indice();
  const etapa = decodificar(reg.codigo).etapa;
  const base = { codigo: reg.codigo, etapa, texto: reg.texto, vigencia: reg.vigencia, fonte: reg.fonte };

  if (etapa === 'EI') {
    const o = reg as ObjetivoEI;
    return {
      ...base,
      campoExperiencias: { id: o.campo_experiencias, nome: i.nomesCampos.get(o.campo_experiencias) ?? o.campo_experiencias },
      grupoEtario: o.grupo_etario,
      alinhamento: o.alinhamento,
    };
  }
  if (etapa === 'EF') {
    const h = reg as HabilidadeEF;
    const nomes: Record<string, string | string[]> = {};
    if ('unidade_tematica' in h.organizacao) nomes.unidadeTematica = resolverNome(h.organizacao.unidade_tematica);
    if (h.organizacao.tipo === 'campo_pratica') {
      nomes.camposAtuacao = h.organizacao.campos_atuacao.map(resolverNome);
      nomes.praticaLinguagem = resolverNome(h.organizacao.pratica_linguagem);
    }
    if (h.organizacao.tipo === 'eixo') nomes.eixo = resolverNome(h.organizacao.eixo);
    return {
      ...base,
      componente: { id: h.componente, nome: i.nomesComponentes.get(h.componente) ?? h.componente },
      anos: h.anos,
      organizacao: { tipo: h.organizacao.tipo, nomes },
      objetosConhecimento: h.objetos_conhecimento.map((id) => ({ id, nome: resolverNome(id) })),
    };
  }
  const h = reg as HabilidadeEM;
  return {
    ...base,
    area: { id: h.area, nome: i.nomesAreas.get(h.area) ?? h.area },
    componente: h.componente ? { id: h.componente, nome: i.nomesComponentes.get(h.componente) ?? h.componente } : null,
    competenciasEspecificas: h.competencias_especificas.map((id) => {
      const c = i.competenciasPorId.get(id);
      return { id, numero: c?.numero ?? 0, texto: c?.texto ?? '' };
    }),
    camposAtuacaoSocial: h.campos_atuacao_social?.map((id) => ({ id, nome: resolverNome(id) })),
  };
}

/** Registro completo de uma aprendizagem pelo código (case-insensitive), com nomes resolvidos. */
export function porCodigo(codigo: string): AprendizagemResolvida {
  const cod = codigo.trim().toUpperCase();
  const reg = indice().porCodigo.get(cod);
  if (!reg) {
    decodificar(cod); // se a gramática for inválida, o erro explica o formato
    throw new Error(`${cod}: código válido na forma, mas não existe na BNCC (dica: a numeração tem lacunas legítimas)`);
  }
  return resolver(reg);
}

export interface FiltroEF { componente?: string; ano?: number; unidadeTematica?: string; pratica?: string; campoAtuacao?: string }

/** Habilidades do Ensino Fundamental, com filtros opcionais. Aceita id (`ef-comp-lp`) ou sigla (`LP`). */
export function habilidadesEF(filtro: FiltroEF = {}): AprendizagemResolvida[] {
  const comp = filtro.componente && (filtro.componente.startsWith('ef-comp-') ? filtro.componente : `ef-comp-${filtro.componente.toLowerCase()}`);
  return indice().habilidadesEF
    .filter((h) => !comp || h.componente === comp)
    .filter((h) => !filtro.ano || h.anos.includes(filtro.ano))
    .filter((h) => !filtro.unidadeTematica || ('unidade_tematica' in h.organizacao && resolverNome(h.organizacao.unidade_tematica) === filtro.unidadeTematica))
    .filter((h) => !filtro.pratica || (h.organizacao.tipo === 'campo_pratica' && resolverNome(h.organizacao.pratica_linguagem) === filtro.pratica))
    .filter((h) => !filtro.campoAtuacao || (h.organizacao.tipo === 'campo_pratica' && h.organizacao.campos_atuacao.some((c) => resolverNome(c) === filtro.campoAtuacao)))
    .map(resolver);
}

export interface FiltroEM { area?: string; competencia?: number; apenasLP?: boolean }

/** Habilidades do Ensino Médio. `area` aceita id (`em-area-lgg`) ou sigla (`LGG`). */
export function habilidadesEM(filtro: FiltroEM = {}): AprendizagemResolvida[] {
  const area = filtro.area && (filtro.area.startsWith('em-area-') ? filtro.area : `em-area-${filtro.area.toLowerCase()}`);
  return indice().habilidadesEM
    .filter((h) => !area || h.area === area)
    .filter((h) => !filtro.apenasLP || h.componente === 'em-comp-lp')
    .filter((h) => !filtro.competencia || h.competencias_especificas.some((id) => indice().competenciasPorId.get(id)?.numero === filtro.competencia))
    .map(resolver);
}

export interface FiltroEI { campo?: string; grupoEtario?: string }

/** Objetivos da Educação Infantil. `campo` aceita id (`ei-campo-ts`) ou sigla (`TS`). */
export function objetivosEI(filtro: FiltroEI = {}): AprendizagemResolvida[] {
  const campo = filtro.campo && (filtro.campo.startsWith('ei-campo-') ? filtro.campo : `ei-campo-${filtro.campo.toLowerCase()}`);
  const grupo = filtro.grupoEtario && (filtro.grupoEtario.startsWith('ei-grupo-') ? filtro.grupoEtario : `ei-grupo-${filtro.grupoEtario}`);
  return indice().objetivosEI
    .filter((o) => !campo || o.campo_experiencias === campo)
    .filter((o) => !grupo || o.grupo_etario === grupo)
    .map(resolver);
}

export interface FiltroBusca { etapa?: 'EI' | 'EF' | 'EM'; componente?: string; ano?: number }

/** Busca textual normalizada (sem acentos/caixa) nos enunciados. Sem rede, sem índice externo. */
export function buscar(texto: string, filtro: FiltroBusca = {}): AprendizagemResolvida[] {
  const alvo = normalizarTexto(texto);
  const i = indice();
  const universo: Array<ObjetivoEI | HabilidadeEF | HabilidadeEM> = [
    ...(!filtro.etapa || filtro.etapa === 'EI' ? i.objetivosEI : []),
    ...(!filtro.etapa || filtro.etapa === 'EF' ? i.habilidadesEF : []),
    ...(!filtro.etapa || filtro.etapa === 'EM' ? i.habilidadesEM : []),
  ];
  const comp = filtro.componente && (filtro.componente.includes('-comp-') ? filtro.componente : `ef-comp-${filtro.componente.toLowerCase()}`);
  return universo
    .filter((r) => normalizarTexto(r.texto).includes(alvo))
    .filter((r) => !comp || ('componente' in r && (r as HabilidadeEF).componente === comp))
    .filter((r) => !filtro.ano || ('anos' in r && (r as HabilidadeEF).anos.includes(filtro.ano)))
    .map(resolver);
}

/** A espinha estrutural completa (etapas, áreas, componentes, competências, recortes). */
export function estrutura() {
  return indice().estrutura;
}

/** Progressão oficial da EI: os objetivos do mesmo aspecto nas três faixas etárias. */
export function progressaoEI(codigo: string): { alinhamento: string; objetivos: AprendizagemResolvida[]; nota?: string } {
  const reg = porCodigo(codigo);
  if (reg.etapa !== 'EI') throw new Error(`${reg.codigo}: progressão por alinhamento só existe na Educação Infantil`);
  const al = indice().alinhamentoPorId.get(reg.alinhamento!);
  if (!al) throw new Error(`${reg.codigo}: alinhamento ${reg.alinhamento} não encontrado`);
  return { alinhamento: al.id, objetivos: al.objetivos.map(porCodigo), nota: al.nota };
}

/** Contagens do dataset (para sanidade e exibição). */
export function estatisticas() {
  const i = indice();
  return {
    total: i.objetivosEI.length + i.habilidadesEF.length + i.habilidadesEM.length,
    educacaoInfantil: i.objetivosEI.length,
    ensinoFundamental: i.habilidadesEF.length,
    ensinoMedio: i.habilidadesEM.length,
    alinhamentosEI: i.alinhamentos.length,
    competenciasGerais: i.estrutura.competencias_gerais.length,
    competenciasEspecificas: i.estrutura.competencias_especificas.length,
  };
}

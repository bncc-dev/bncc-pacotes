/**
 * Núcleo injetável do @bncc/dados: toda a lógica de consulta, parametrizada
 * pelos dados (sem sistema de arquivos). Permite runtimes sem fs, como
 * Cloudflare Workers: importe os JSONs como módulos e chame criarConsultas().
 *
 * A entrada padrão do pacote (index.ts) usa este núcleo carregando os JSONs
 * embutidos do disco.
 */
import { decodificar } from './decodificar.js';
import type {
  Alinhamento, AprendizagemResolvida, ContextoOrganizacao, Estrutura,
  HabilidadeEF, HabilidadeEM, ObjetivoEI,
} from './tipos.js';

// Reexporta o decodificador (puro) para que runtimes sem fs não precisem
// tocar na entrada padrão do pacote, que importa node:fs.
export { decodificar, CAMPOS_EI, GRUPOS_EI, COMPONENTES_EF, BLOCOS_EF, AREAS_EM } from './decodificar.js';
export type { CodigoDecodificado, CodigoEI, CodigoEF, CodigoEM } from './decodificar.js';
export type { AprendizagemResolvida } from './tipos.js';

export interface DadosBNCC {
  estrutura: Estrutura;
  educacaoInfantil: { objetivos: ObjetivoEI[]; alinhamentos: Alinhamento[] };
  ensinoFundamental: { habilidades: HabilidadeEF[]; contextos_organizacao: ContextoOrganizacao[] };
  ensinoMedio: { habilidades: HabilidadeEM[]; contextos_organizacao: ContextoOrganizacao[] };
  versao?: { data_version: string; origem: string; commit: string; checksums_sha256: Record<string, string> };
}

/** Normalização para busca textual: minúsculas, sem acentos, espaços únicos. */
export function normalizarTexto(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export interface FiltroEF { componente?: string; ano?: number; unidadeTematica?: string; pratica?: string; campoAtuacao?: string }
export interface FiltroEM { area?: string; competencia?: number; apenasLP?: boolean }
export interface FiltroEI { campo?: string; grupoEtario?: string }
export interface FiltroBusca { etapa?: 'EI' | 'EF' | 'EM'; componente?: string; ano?: number }

export function criarConsultas(dados: DadosBNCC) {
  const estruturaDados = dados.estrutura;
  const ei = dados.educacaoInfantil;
  const ef = dados.ensinoFundamental;
  const em = dados.ensinoMedio;

  const porCodigoMapa = new Map<string, ObjetivoEI | HabilidadeEF | HabilidadeEM>();
  for (const o of ei.objetivos) porCodigoMapa.set(o.codigo, o);
  for (const h of ef.habilidades) porCodigoMapa.set(h.codigo, h);
  for (const h of em.habilidades) porCodigoMapa.set(h.codigo, h);

  const contextos = new Map<string, ContextoOrganizacao>();
  for (const c of [...ef.contextos_organizacao, ...em.contextos_organizacao]) contextos.set(c.id, c);

  const competenciasPorId = new Map(estruturaDados.competencias_especificas.map((c) => [c.id, c]));
  const alinhamentoPorId = new Map(ei.alinhamentos.map((a) => [a.id, a]));
  const nomesComponentes = new Map(estruturaDados.componentes_curriculares.map((c) => [c.id, c.nome]));
  const nomesAreas = new Map(estruturaDados.areas_conhecimento.map((a) => [a.id, a.nome]));
  const nomesCampos = new Map(estruturaDados.campos_experiencias.map((c) => [c.id, c.nome]));

  function resolverNome(id: string): string {
    return contextos.get(id)?.nome ?? nomesComponentes.get(id) ?? nomesAreas.get(id) ?? nomesCampos.get(id) ?? id;
  }

  function resolver(reg: ObjetivoEI | HabilidadeEF | HabilidadeEM): AprendizagemResolvida {
    const etapa = decodificar(reg.codigo).etapa;
    const base = { codigo: reg.codigo, etapa, texto: reg.texto, vigencia: reg.vigencia, fonte: reg.fonte };

    if (etapa === 'EI') {
      const o = reg as ObjetivoEI;
      return {
        ...base,
        campoExperiencias: { id: o.campo_experiencias, nome: nomesCampos.get(o.campo_experiencias) ?? o.campo_experiencias },
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
        componente: { id: h.componente, nome: nomesComponentes.get(h.componente) ?? h.componente },
        anos: h.anos,
        organizacao: { tipo: h.organizacao.tipo, nomes },
        objetosConhecimento: h.objetos_conhecimento.map((id) => ({ id, nome: resolverNome(id) })),
      };
    }
    const h = reg as HabilidadeEM;
    return {
      ...base,
      area: { id: h.area, nome: nomesAreas.get(h.area) ?? h.area },
      componente: h.componente ? { id: h.componente, nome: nomesComponentes.get(h.componente) ?? h.componente } : null,
      competenciasEspecificas: h.competencias_especificas.map((id) => {
        const c = competenciasPorId.get(id);
        return { id, numero: c?.numero ?? 0, texto: c?.texto ?? '' };
      }),
      camposAtuacaoSocial: h.campos_atuacao_social?.map((id) => ({ id, nome: resolverNome(id) })),
    };
  }

  function porCodigo(codigo: string): AprendizagemResolvida {
    const cod = codigo.trim().toUpperCase();
    const reg = porCodigoMapa.get(cod);
    if (!reg) {
      decodificar(cod);
      throw new Error(`${cod}: código válido na forma, mas não existe na BNCC (dica: a numeração tem lacunas legítimas)`);
    }
    return resolver(reg);
  }

  function habilidadesEF(filtro: FiltroEF = {}): AprendizagemResolvida[] {
    const comp = filtro.componente && (filtro.componente.startsWith('ef-comp-') ? filtro.componente : `ef-comp-${filtro.componente.toLowerCase()}`);
    return ef.habilidades
      .filter((h) => !comp || h.componente === comp)
      .filter((h) => !filtro.ano || h.anos.includes(filtro.ano))
      .filter((h) => !filtro.unidadeTematica || ('unidade_tematica' in h.organizacao && resolverNome(h.organizacao.unidade_tematica) === filtro.unidadeTematica))
      .filter((h) => !filtro.pratica || (h.organizacao.tipo === 'campo_pratica' && resolverNome(h.organizacao.pratica_linguagem) === filtro.pratica))
      .filter((h) => !filtro.campoAtuacao || (h.organizacao.tipo === 'campo_pratica' && h.organizacao.campos_atuacao.some((c) => resolverNome(c) === filtro.campoAtuacao)))
      .map(resolver);
  }

  function habilidadesEM(filtro: FiltroEM = {}): AprendizagemResolvida[] {
    const area = filtro.area && (filtro.area.startsWith('em-area-') ? filtro.area : `em-area-${filtro.area.toLowerCase()}`);
    return em.habilidades
      .filter((h) => !area || h.area === area)
      .filter((h) => !filtro.apenasLP || h.componente === 'em-comp-lp')
      .filter((h) => !filtro.competencia || h.competencias_especificas.some((id) => competenciasPorId.get(id)?.numero === filtro.competencia))
      .map(resolver);
  }

  function objetivosEI(filtro: FiltroEI = {}): AprendizagemResolvida[] {
    const campo = filtro.campo && (filtro.campo.startsWith('ei-campo-') ? filtro.campo : `ei-campo-${filtro.campo.toLowerCase()}`);
    const grupo = filtro.grupoEtario && (filtro.grupoEtario.startsWith('ei-grupo-') ? filtro.grupoEtario : `ei-grupo-${filtro.grupoEtario}`);
    return ei.objetivos
      .filter((o) => !campo || o.campo_experiencias === campo)
      .filter((o) => !grupo || o.grupo_etario === grupo)
      .map(resolver);
  }

  function buscar(texto: string, filtro: FiltroBusca = {}): AprendizagemResolvida[] {
    const alvo = normalizarTexto(texto);
    const universo: Array<ObjetivoEI | HabilidadeEF | HabilidadeEM> = [
      ...(!filtro.etapa || filtro.etapa === 'EI' ? ei.objetivos : []),
      ...(!filtro.etapa || filtro.etapa === 'EF' ? ef.habilidades : []),
      ...(!filtro.etapa || filtro.etapa === 'EM' ? em.habilidades : []),
    ];
    const comp = filtro.componente && (filtro.componente.includes('-comp-') ? filtro.componente : `ef-comp-${filtro.componente.toLowerCase()}`);
    return universo
      .filter((r) => normalizarTexto(r.texto).includes(alvo))
      .filter((r) => !comp || ('componente' in r && (r as HabilidadeEF).componente === comp))
      .filter((r) => !filtro.ano || ('anos' in r && (r as HabilidadeEF).anos.includes(filtro.ano)))
      .map(resolver);
  }

  function progressaoEI(codigo: string): { alinhamento: string; objetivos: AprendizagemResolvida[]; nota?: string } {
    const reg = porCodigo(codigo);
    if (reg.etapa !== 'EI') throw new Error(`${reg.codigo}: progressão por alinhamento só existe na Educação Infantil`);
    const al = alinhamentoPorId.get(reg.alinhamento!);
    if (!al) throw new Error(`${reg.codigo}: alinhamento ${reg.alinhamento} não encontrado`);
    return { alinhamento: al.id, objetivos: al.objetivos.map(porCodigo), nota: al.nota };
  }

  function estrutura() {
    return estruturaDados;
  }

  function estatisticas() {
    return {
      total: ei.objetivos.length + ef.habilidades.length + em.habilidades.length,
      educacaoInfantil: ei.objetivos.length,
      ensinoFundamental: ef.habilidades.length,
      ensinoMedio: em.habilidades.length,
      alinhamentosEI: ei.alinhamentos.length,
      competenciasGerais: estruturaDados.competencias_gerais.length,
      competenciasEspecificas: estruturaDados.competencias_especificas.length,
    };
  }

  return { porCodigo, habilidadesEF, habilidadesEM, objetivosEI, buscar, progressaoEI, estrutura, estatisticas };
}

export type Consultas = ReturnType<typeof criarConsultas>;

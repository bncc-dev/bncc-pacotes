/**
 * Tipos do dataset — espelho fiel dos JSON Schemas do bncc-dados
 * (schema/*.schema.json). Mantidos à mão nesta versão; a validação de
 * conformidade acontece no repositório de dados a cada mudança.
 */

export interface Fonte {
  documento: string;
  arquivo?: string;
  proveniencia?: string;
  localizador?: string;
  localizador_pdf?: string;
  url_oficial?: string;
}

export interface Vigencia {
  status: 'vigente' | 'alterado' | 'revogado';
  desde: string;
  ate: string | null;
}

export interface ObjetivoEI {
  codigo: string;
  documento: string;
  texto: string;
  campo_experiencias: string;
  grupo_etario: string;
  alinhamento: string;
  vigencia: Vigencia;
  fonte: Fonte;
}

export interface Alinhamento {
  id: string;
  campo_experiencias: string;
  objetivos: string[];
  nota?: string;
}

export type OrganizacaoEF =
  | { tipo: 'unidade_tematica'; unidade_tematica: string }
  | { tipo: 'campo_pratica'; campos_atuacao: string[]; pratica_linguagem: string }
  | { tipo: 'eixo'; eixo: string; unidade_tematica: string };

export interface HabilidadeEF {
  codigo: string;
  documento: string;
  texto: string;
  componente: string;
  anos: number[];
  organizacao: OrganizacaoEF;
  objetos_conhecimento: string[];
  vigencia: Vigencia;
  fonte: Fonte;
}

export interface HabilidadeEM {
  codigo: string;
  documento: string;
  texto: string;
  area: string;
  componente: string | null;
  competencias_especificas: string[];
  campos_atuacao_social: string[] | null;
  seriacao: null;
  vigencia: Vigencia;
  fonte: Fonte;
}

export interface ContextoOrganizacao {
  id: string;
  tipo: 'ut' | 'oc' | 'catu' | 'prat' | 'eixo';
  nome: string;
  componente: string;
  fonte: Fonte;
}

export interface CompetenciaGeral {
  id: string;
  documento: string;
  tipo: 'geral';
  numero: number;
  texto: string;
  fonte: Fonte;
}

export interface CompetenciaEspecifica {
  id: string;
  documento: string;
  tipo: 'especifica_de_area' | 'especifica_de_componente';
  area?: string;
  componente?: string;
  numero: number;
  texto: string;
  fonte: Fonte;
}

export interface Estrutura {
  documento_curricular: Array<{ id: string; nome: string; tipo: string; esfera: string; derivado_de: string | null }>;
  etapas: Array<{ id: 'EI' | 'EF' | 'EM'; nome: string }>;
  modalidades: Array<{ id: string; nome: string; transversal_a: string[]; segmentos: Array<{ id: string; corresponde_a: string }> }>;
  areas_conhecimento: Array<{ id: string; etapa: string; nome: string; documento?: string }>;
  componentes_curriculares: Array<{
    id: string; etapa: string; nome: string; sigla_codigo: string | null; area: string;
    tem_aprendizagens_proprias: boolean; presenca?: { anos: number[] } | null;
    destaque_legal?: string; nota?: string; fonte?: Fonte;
  }>;
  recortes_temporais: Array<Record<string, unknown>>;
  campos_experiencias: Array<{ id: string; nome: string; documento: string }>;
  direitos_aprendizagem: Array<{ id: string; nome: string; documento: string }>;
  competencias_gerais: CompetenciaGeral[];
  competencias_especificas: CompetenciaEspecifica[];
}

/** Registro de aprendizagem com nomes de contexto resolvidos. */
export interface AprendizagemResolvida {
  codigo: string;
  etapa: 'EI' | 'EF' | 'EM';
  texto: string;
  vigencia: Vigencia;
  fonte: Fonte;
  /** EI */
  campoExperiencias?: { id: string; nome: string };
  grupoEtario?: string;
  alinhamento?: string;
  /** EF */
  componente?: { id: string; nome: string } | null;
  anos?: number[];
  organizacao?: { tipo: string; nomes: Record<string, string | string[]> };
  objetosConhecimento?: Array<{ id: string; nome: string }>;
  /** EM */
  area?: { id: string; nome: string };
  competenciasEspecificas?: Array<{ id: string; numero: number; texto: string }>;
  camposAtuacaoSocial?: Array<{ id: string; nome: string }>;
}

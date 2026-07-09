/**
 * Camada fina do site sobre o @bncc/dados: vizinhança, agrupamentos e
 * metadados de exibição (cores por etapa, rótulos).
 */
import {
  estatisticas, estrutura, habilidadesEF, habilidadesEM, objetivosEI,
  porCodigo, progressaoEI, versao,
} from '@bncc/dados';
import type { AprendizagemResolvida } from '@bncc/dados';

export { estatisticas, estrutura, habilidadesEF, habilidadesEM, objetivosEI, porCodigo, progressaoEI, versao };
export type { AprendizagemResolvida };

/** Cores da linguagem visual do documento oficial da BNCC, por etapa. */
export const ETAPAS = {
  EI: { nome: 'Educação Infantil', cor: '#2e7d4f', rota: 'infantil' },
  EF: { nome: 'Ensino Fundamental', cor: '#1e5b8a', rota: 'fundamental' },
  EM: { nome: 'Ensino Médio', cor: '#b8860b', rota: 'medio' },
} as const;

export const GRUPOS_EI_ROTULOS: Record<string, string> = {
  'ei-grupo-01': 'Bebês (zero a 1 ano e 6 meses)',
  'ei-grupo-02': 'Crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)',
  'ei-grupo-03': 'Crianças pequenas (4 anos a 5 anos e 11 meses)',
};

export function rotaDe(codigo: string): string {
  return codigo.startsWith('EI') ? `/objetivo/${codigo}/` : `/habilidade/${codigo}/`;
}

export function todasAprendizagens(): AprendizagemResolvida[] {
  return [...objetivosEI(), ...habilidadesEF(), ...habilidadesEM()];
}

/** Anterior/próxima dentro do mesmo agrupamento natural (componente/área/campo). */
export function vizinhanca(reg: AprendizagemResolvida): { anterior?: AprendizagemResolvida; proxima?: AprendizagemResolvida } {
  let grupo: AprendizagemResolvida[];
  if (reg.etapa === 'EI') grupo = objetivosEI({ campo: reg.campoExperiencias!.id });
  else if (reg.etapa === 'EF') grupo = habilidadesEF({ componente: reg.componente!.id });
  else grupo = habilidadesEM({ area: reg.area!.id });
  const i = grupo.findIndex((h) => h.codigo === reg.codigo);
  return { anterior: grupo[i - 1], proxima: grupo[i + 1] };
}

/** Descrição de até ~155 chars para meta description. */
export function metaDescricao(reg: AprendizagemResolvida): string {
  const contexto = reg.etapa === 'EI'
    ? `${reg.campoExperiencias!.nome} · Educação Infantil`
    : reg.etapa === 'EF'
      ? `${reg.componente!.nome} · ${reg.anos!.map((a) => `${a}º`).join(' e ')} ano · Ensino Fundamental`
      : `${reg.area!.nome} · Ensino Médio`;
  const texto = reg.texto.length > 110 ? reg.texto.slice(0, 107) + '…' : reg.texto;
  return `${reg.codigo} (${contexto}): ${texto}`;
}

/** JSON-LD schema.org para a página da aprendizagem. */
export function jsonLd(reg: AprendizagemResolvida, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: `${reg.codigo} · BNCC`,
    description: reg.texto,
    url,
    inLanguage: 'pt-BR',
    educationalAlignment: {
      '@type': 'AlignmentObject',
      alignmentType: 'educationalSubject',
      educationalFramework: 'Base Nacional Comum Curricular (BNCC)',
      targetName: reg.codigo,
      targetDescription: reg.texto,
    },
    isBasedOn: 'https://github.com/bncc-dev/bncc-dados',
    license: 'https://creativecommons.org/licenses/by/4.0/deed.pt-br',
  };
}

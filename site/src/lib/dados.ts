/**
 * Camada fina do site sobre o @bncc/dados: vizinhança, agrupamentos e
 * metadados de exibição (cores por etapa, rótulos).
 */
import {
  decodificar, estatisticas, estrutura, habilidadesEF, habilidadesEM, objetivosEI,
  porCodigo, progressaoEI, versao,
} from '@bncc/dados';
import type { AprendizagemResolvida } from '@bncc/dados';

export { decodificar, estatisticas, estrutura, habilidadesEF, habilidadesEM, objetivosEI, porCodigo, progressaoEI, versao };
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

/** Segmentos do código para o decodificador visual, com explicações. */
export function segmentosDecoder(codigo: string): Array<{ parte: string; rotulo: string; explica: string }> {
  const d = decodificar(codigo) as any;
  if (d.etapa === 'EI') {
    return [
      { parte: 'EI', rotulo: 'etapa', explica: '<strong>EI</strong> indica a etapa: Educação Infantil' },
      { parte: codigo.slice(2, 4), rotulo: 'grupo etário', explica: `<strong>${codigo.slice(2, 4)}</strong> indica o grupo por faixa etária: ${d.grupoEtarioNome}` },
      { parte: codigo.slice(4, 6), rotulo: 'campo', explica: `<strong>${codigo.slice(4, 6)}</strong> indica o campo de experiências: ${d.campoExperienciasNome}` },
      { parte: codigo.slice(6), rotulo: 'sequência', explica: `<strong>${codigo.slice(6)}</strong> indica a posição na numeração do campo para este grupo` },
    ];
  }
  if (d.etapa === 'EF') {
    const anosTxt = d.anos.length > 1 ? `habilidade comum ao ${d.anos.map((a: number) => `${a}º`).join(' e ')} anos` : `${d.anos[0]}º ano`;
    return [
      { parte: 'EF', rotulo: 'etapa', explica: '<strong>EF</strong> indica a etapa: Ensino Fundamental' },
      { parte: codigo.slice(2, 4), rotulo: d.bloco ? 'bloco de anos' : 'ano', explica: `<strong>${codigo.slice(2, 4)}</strong> indica ${d.bloco ? 'o bloco de anos' : 'o ano'}: ${anosTxt}` },
      { parte: codigo.slice(4, 6), rotulo: 'componente', explica: `<strong>${codigo.slice(4, 6)}</strong> indica o componente curricular: ${d.componenteNome}` },
      { parte: codigo.slice(6), rotulo: 'sequência', explica: `<strong>${codigo.slice(6)}</strong> indica a posição: ${Number(codigo.slice(6))}ª habilidade na numeração do ${d.bloco ? 'bloco' : 'ano'}` },
    ];
  }
  const base = [
    { parte: 'EM', rotulo: 'etapa', explica: '<strong>EM</strong> indica a etapa: Ensino Médio' },
    { parte: '13', rotulo: 'séries', explica: '<strong>13</strong> indica que a habilidade pode ser desenvolvida em qualquer série (1ª a 3ª), conforme os currículos' },
  ];
  if (d.componente === 'LP') {
    return [...base,
      { parte: 'LP', rotulo: 'componente', explica: '<strong>LP</strong> indica o componente destacado: Língua Portuguesa (Lei nº 13.415/2017)' },
      { parte: codigo.slice(6), rotulo: 'sequência', explica: `<strong>${codigo.slice(6)}</strong> indica a posição na numeração de Língua Portuguesa` },
    ];
  }
  return [...base,
    { parte: d.area, rotulo: 'área', explica: `<strong>${d.area}</strong> indica a área do conhecimento: ${d.areaNome}` },
    { parte: codigo.slice(7, 8), rotulo: 'competência', explica: `<strong>${codigo.slice(7, 8)}</strong> indica a competência específica da área à qual a habilidade se vincula` },
    { parte: codigo.slice(8), rotulo: 'sequência', explica: `<strong>${codigo.slice(8)}</strong> indica a posição no conjunto de habilidades da competência` },
  ];
}

/** Habilidades que compartilham objeto de conhecimento (EF), com rótulo de relação. */
export function mesmasDoObjeto(reg: AprendizagemResolvida, limite = 5): AprendizagemResolvida[] {
  if (reg.etapa !== 'EF' || !reg.objetosConhecimento?.length) return [];
  const meus = new Set(reg.objetosConhecimento.map((o) => o.id));
  return habilidadesEF({ componente: reg.componente!.id })
    .filter((h) => h.codigo !== reg.codigo && h.objetosConhecimento!.some((o) => meus.has(o.id)))
    .slice(0, limite);
}

/** Mesma prática/unidade/eixo em OUTROS anos (aproximação estrutural, não progressão oficial). */
export function mesmaOrganizacaoOutrosAnos(reg: AprendizagemResolvida, limite = 5): AprendizagemResolvida[] {
  if (reg.etapa !== 'EF') return [];
  const nomes = reg.organizacao!.nomes as Record<string, string | string[]>;
  const filtro = nomes.praticaLinguagem
    ? { componente: reg.componente!.id, pratica: nomes.praticaLinguagem as string }
    : { componente: reg.componente!.id, unidadeTematica: nomes.unidadeTematica as string };
  const meusAnos = new Set(reg.anos!);
  return habilidadesEF(filtro)
    .filter((h) => h.codigo !== reg.codigo && !h.anos!.some((a) => meusAnos.has(a)))
    .slice(0, limite);
}

/** Habilidades do EM vinculadas à(s) mesma(s) competência(s). */
export function mesmaCompetenciaEM(reg: AprendizagemResolvida, limite = 5): AprendizagemResolvida[] {
  if (reg.etapa !== 'EM') return [];
  const minhas = new Set(reg.competenciasEspecificas!.map((c) => c.id));
  return habilidadesEM({ area: reg.area!.id })
    .filter((h) => h.codigo !== reg.codigo && h.competenciasEspecificas!.some((c) => minhas.has(c.id)))
    .slice(0, limite);
}

/** URL de issue pré-preenchida para reportar erro num registro. */
export function urlReportarErro(codigo: string): string {
  const titulo = encodeURIComponent(`Possível erro em ${codigo}`);
  const corpo = encodeURIComponent(`Registro: ${codigo}\nO que parece errado:\nFonte oficial que sustenta a correção (obrigatória):`);
  return `https://github.com/bncc-dev/bncc-dados/issues/new?title=${titulo}&body=${corpo}`;
}

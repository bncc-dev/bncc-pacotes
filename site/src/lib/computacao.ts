/**
 * Camada do site para o complemento de Computação (documento computacao-2022,
 * anexo ao Parecer CNE/CEB 2/2022). Lê o JSON bruto do @bncc/dados (subpath
 * ./dados/computacao.json); a API tipada dos pacotes ganha o módulo na 1.0.
 */
import bruto from '@bncc/dados/dados/computacao.json';
import { SITE, rotaDe, versao } from './dados';

export const COMPUTACAO = {
  nome: 'Computação',
  badge: 'Complemento à BNCC',
  cor: '#0e7a6b',
  rota: 'computacao',
  parecer: 'Parecer CNE/CEB nº 2/2022',
  resolucao: 'Resolução CNE/CEB nº 1/2022',
  urlAnexo: 'https://www.gov.br/mec/pt-br/cne/pdf/pareceres-do-cne/ceb/2022/anexo-ao-parecer-cneceb-no-2-2022-bncc-computacao.pdf',
} as const;

interface EixoCO { id: string; nome: string }
interface ObjetoCO { id: string; nome: string; pai: string | null }
interface CompetenciaCO { id: string; tipo: string; numero: number; texto: string }

export interface AprendizagemCO {
  codigo: string;
  etapa: 'EI' | 'EF' | 'EM';
  texto: string;
  eixo?: EixoCO;
  objetos?: ObjetoCO[];
  objetoPai?: ObjetoCO;
  anos?: number[];
  grupoEtario?: string;
  competencia?: CompetenciaCO;
  vigencia: { status: string; desde: string; ate: string | null };
  fonte: { arquivo: string; localizador?: string; localizador_pdf?: string };
}

const eixos = new Map<string, EixoCO>(bruto.eixos.map((e: any) => [e.id, { id: e.id, nome: e.nome }]));
const objetos = new Map<string, ObjetoCO>(bruto.objetos_conhecimento.map((o: any) => [o.id, o]));
const competencias = new Map<string, CompetenciaCO>(bruto.competencias.map((c: any) => [c.id, c]));

function resolver(r: any): AprendizagemCO {
  const objs = (r.objetos_conhecimento ?? []).map((id: string) => objetos.get(id)!);
  const pai = objs[0]?.pai ? objetos.get(objs[0].pai) : undefined;
  return {
    codigo: r.codigo,
    etapa: r.codigo.slice(0, 2) as 'EI' | 'EF' | 'EM',
    texto: r.texto,
    eixo: r.eixo ? eixos.get(r.eixo) : undefined,
    objetos: objs.length ? objs : undefined,
    objetoPai: pai,
    anos: r.anos,
    grupoEtario: r.grupo_etario,
    competencia: r.competencia ? competencias.get(r.competencia) : undefined,
    vigencia: r.vigencia,
    fonte: r.fonte,
  };
}

const TODAS: AprendizagemCO[] = [
  ...bruto.objetivos_ei.map(resolver),
  ...bruto.habilidades_ef.map(resolver),
  ...bruto.habilidades_em.map(resolver),
];
const POR_CODIGO = new Map(TODAS.map((a) => [a.codigo, a]));

export function aprendizagensCO(): AprendizagemCO[] { return TODAS; }
export function porCodigoCO(codigo: string): AprendizagemCO | undefined { return POR_CODIGO.get(codigo); }
export function eixosCO(): EixoCO[] { return [...eixos.values()]; }
export function competenciasCO(): CompetenciaCO[] { return [...competencias.values()]; }
export function competenciasGeraisCO(): CompetenciaCO[] {
  return [...competencias.values()].filter((c) => c.tipo === 'geral_computacao');
}
export function competenciasEmCO(): CompetenciaCO[] {
  return [...competencias.values()].filter((c) => c.tipo === 'especifica_em_computacao');
}

export function ehComputacao(codigo: string): boolean {
  return /^E[IFM]\d{2}CO\d{2}$/.test(codigo);
}

/** Anterior/próxima na ordem natural do módulo. */
export function vizinhancaCO(reg: AprendizagemCO): { anterior?: AprendizagemCO; proxima?: AprendizagemCO } {
  const i = TODAS.findIndex((a) => a.codigo === reg.codigo);
  return { anterior: TODAS[i - 1], proxima: TODAS[i + 1] };
}

export function mesmasDoObjetoCO(reg: AprendizagemCO, limite = 5): AprendizagemCO[] {
  if (!reg.objetos?.length) return [];
  const meus = new Set(reg.objetos.map((o) => o.id));
  return TODAS.filter((a) => a.codigo !== reg.codigo && a.objetos?.some((o) => meus.has(o.id))).slice(0, limite);
}

/** Mesmo eixo em outros anos do EF (aproximação estrutural, como no núcleo). */
export function mesmoEixoOutrosAnosCO(reg: AprendizagemCO, limite = 5): AprendizagemCO[] {
  if (reg.etapa !== 'EF' || !reg.eixo) return [];
  const meusAnos = new Set(reg.anos ?? []);
  return TODAS.filter((a) => a.etapa === 'EF' && a.codigo !== reg.codigo
    && a.eixo?.id === reg.eixo!.id && !a.anos!.some((x) => meusAnos.has(x))).slice(0, limite);
}

export function mesmaCompetenciaCO(reg: AprendizagemCO, limite = 5): AprendizagemCO[] {
  if (!reg.competencia) return [];
  return TODAS.filter((a) => a.codigo !== reg.codigo && a.competencia?.id === reg.competencia!.id).slice(0, limite);
}

export function estatisticasCO() {
  return {
    total: TODAS.length,
    ei: bruto.objetivos_ei.length,
    ef: bruto.habilidades_ef.length,
    em: bruto.habilidades_em.length,
    porEixo: [...eixos.values()].map((e) => ({
      ...e,
      total: TODAS.filter((a) => a.eixo?.id === e.id).length,
    })),
  };
}

export function metaDescricaoCO(reg: AprendizagemCO): string {
  const contexto = reg.etapa === 'EI'
    ? 'Computação · Educação Infantil (pré-escola)'
    : reg.etapa === 'EF'
      ? `Computação · ${reg.anos!.map((a) => `${a}º`).join(' e ')} ano · Ensino Fundamental`
      : 'Computação · Ensino Médio';
  const texto = reg.texto.length > 105 ? reg.texto.slice(0, 102) + '…' : reg.texto;
  return `${reg.codigo} (${contexto}, complemento à BNCC): ${texto}`;
}

export function jsonLdCO(reg: AprendizagemCO, url: string) {
  const educationalLevel = reg.etapa === 'EI'
    ? 'Educação Infantil · Crianças pequenas (4 anos a 5 anos e 11 meses)'
    : reg.etapa === 'EF'
      ? reg.anos!.map((a) => `${a}º ano do Ensino Fundamental`)
      : 'Ensino Médio (1ª a 3ª série)';
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: `${reg.codigo} · BNCC Computação`,
    identifier: reg.codigo,
    description: reg.texto,
    url,
    inLanguage: 'pt-BR',
    educationalLevel,
    version: versao().data_version,
    educationalAlignment: {
      '@type': 'AlignmentObject',
      alignmentType: 'educationalSubject',
      educationalFramework: 'Computação na Educação Básica (complemento à BNCC, Parecer CNE/CEB 2/2022)',
      targetName: reg.codigo,
      targetDescription: reg.texto,
    },
    isPartOf: { '@id': `${SITE}/#dataset` },
    isBasedOn: 'https://github.com/bncc-dev/bncc-dados',
    license: 'https://creativecommons.org/licenses/by/4.0/deed.pt-br',
  };
}

export function breadcrumbCO(reg: AprendizagemCO): Array<{ nome: string; url?: string }> {
  const itens: Array<{ nome: string; url?: string }> = [{ nome: 'Computação', url: '/computacao/' }];
  if (reg.eixo) itens.push({ nome: reg.eixo.nome, url: `/computacao/#${reg.eixo.id.replace('co-eixo-', '')}` });
  if (reg.competencia) itens.push({ nome: `Competência ${reg.competencia.numero} do EM`, url: '/computacao/#medio' });
  itens.push({ nome: reg.codigo });
  return itens;
}

export function segmentosDecoderCO(reg: AprendizagemCO): Array<{ parte: string; rotulo: string; explica: string }> {
  const c = reg.codigo;
  if (reg.etapa === 'EI') {
    return [
      { parte: 'EI', rotulo: 'etapa', explica: '<strong>EI</strong> indica a etapa: Educação Infantil' },
      { parte: '03', rotulo: 'grupo etário', explica: '<strong>03</strong> indica crianças pequenas (4 anos a 5 anos e 11 meses); o complemento só define objetivos para a pré-escola' },
      { parte: 'CO', rotulo: 'Computação', explica: '<strong>CO</strong> indica Computação, complemento à BNCC (Parecer CNE/CEB 2/2022)' },
      { parte: c.slice(6), rotulo: 'sequência', explica: `<strong>${c.slice(6)}</strong> indica a posição na numeração dos objetivos de Computação` },
    ];
  }
  if (reg.etapa === 'EF') {
    const bloco = ['15', '69'].includes(c.slice(2, 4));
    const anosTxt = bloco ? `habilidade comum do ${reg.anos![0]}º ao ${reg.anos![reg.anos!.length - 1]}º ano` : `${reg.anos![0]}º ano`;
    return [
      { parte: 'EF', rotulo: 'etapa', explica: '<strong>EF</strong> indica a etapa: Ensino Fundamental' },
      { parte: c.slice(2, 4), rotulo: bloco ? 'bloco de anos' : 'ano', explica: `<strong>${c.slice(2, 4)}</strong> indica ${bloco ? 'o bloco de anos' : 'o ano'}: ${anosTxt}` },
      { parte: 'CO', rotulo: 'Computação', explica: '<strong>CO</strong> indica Computação, complemento à BNCC (Parecer CNE/CEB 2/2022)' },
      { parte: c.slice(6), rotulo: 'sequência', explica: `<strong>${c.slice(6)}</strong> indica a posição na numeração do ${bloco ? 'bloco' : 'ano'}` },
    ];
  }
  return [
    { parte: 'EM', rotulo: 'etapa', explica: '<strong>EM</strong> indica a etapa: Ensino Médio' },
    { parte: '13', rotulo: 'séries', explica: '<strong>13</strong> indica que a habilidade pode ser desenvolvida em qualquer série (1ª a 3ª), conforme os currículos' },
    { parte: 'CO', rotulo: 'Computação', explica: '<strong>CO</strong> indica Computação, complemento à BNCC (Parecer CNE/CEB 2/2022)' },
    { parte: c.slice(6), rotulo: 'sequência', explica: `<strong>${c.slice(6)}</strong> indica a posição na numeração das habilidades de Computação do EM` },
  ];
}

/** Versão markdown da página (irmã .md), no padrão de lib/markdown.ts. */
export function aprendizagemCOParaMd(reg: AprendizagemCO): string {
  const v = versao();
  const paginaPdf = reg.fonte.localizador_pdf?.match(/página PDF (\d+)/)?.[1];
  const tipo = reg.etapa === 'EI' ? 'objetivo de aprendizagem e desenvolvimento' : 'habilidade';
  const etapaNome = { EI: 'Educação Infantil', EF: 'Ensino Fundamental', EM: 'Ensino Médio' }[reg.etapa];

  const front = [
    '---',
    `codigo: ${reg.codigo}`,
    `tipo: ${tipo}`,
    `documento: Computação na Educação Básica (complemento à BNCC, ${COMPUTACAO.parecer})`,
    `etapa: ${etapaNome}`,
  ];
  if (reg.anos) front.push(`anos: [${reg.anos.join(', ')}]`);
  if (reg.grupoEtario) front.push('grupo_etario: Crianças pequenas (4 anos a 5 anos e 11 meses)');
  if (reg.eixo) front.push(`eixo: ${reg.eixo.nome}`);
  if (reg.objetoPai) front.push(`objeto_pai: ${reg.objetoPai.nome}`);
  if (reg.objetos?.length) front.push(`objetos_conhecimento: ${reg.objetos.map((o) => o.nome).join(' · ')}`);
  if (reg.competencia) front.push(`competencia_especifica: ${reg.competencia.numero}. ${reg.competencia.texto}`);
  front.push(
    `versao_dados: ${v.data_version}`,
    'licenca: CC BY 4.0',
    `url: ${SITE}${rotaDe(reg.codigo)}`,
    `fonte: anexo ao ${COMPUTACAO.parecer}${paginaPdf ? `, p. ${paginaPdf} do PDF` : ''}`,
    `citacao_sugerida: "${reg.codigo} · BNCC Computação (${v.data_version}) · ${SITE}${rotaDe(reg.codigo)}"`,
    '---',
  );

  const rel = (h: AprendizagemCO, rotulo: string) =>
    `- [${h.codigo}](${SITE}${rotaDe(h.codigo).replace(/\/$/, '')}.md) (${rotulo}): ${h.texto}`;
  const corpo = ['', `# ${reg.codigo}`, '', reg.texto, ''];
  const doObjeto = mesmasDoObjetoCO(reg);
  if (doObjeto.length) {
    corpo.push('## No mesmo objeto de conhecimento', '',
      ...doObjeto.map((h) => rel(h, h.anos ? h.anos.map((a) => `${a}º`).join('–') : h.etapa)), '');
  }
  const daComp = mesmaCompetenciaCO(reg);
  if (daComp.length) {
    corpo.push(`## Vinculadas à mesma competência específica (${reg.competencia!.numero})`, '',
      ...daComp.map((h) => rel(h, 'EM')), '');
  }
  corpo.push(
    '## Proveniência', '',
    `Texto conferido caractere a caractere contra o anexo oficial ao ${COMPUTACAO.parecer}${paginaPdf ? `, p. ${paginaPdf} do PDF` : ''}. ` +
    `Instituído pela ${COMPUTACAO.resolucao}. Dados: [github.com/bncc-dev/bncc-dados](https://github.com/bncc-dev/bncc-dados) (CC BY 4.0).`, '');
  return front.join('\n') + corpo.join('\n');
}

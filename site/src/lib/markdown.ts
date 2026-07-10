/**
 * Versão markdown de cada página de aprendizagem (/habilidade/{codigo}.md e
 * /objetivo/{codigo}.md): o mesmo conteúdo da página HTML em texto limpo,
 * para LLMs e agentes gastarem uma fração dos tokens.
 */
import {
  ETAPAS, GRUPOS_EI_ROTULOS, SITE, mesmaCompetenciaEM, mesmaOrganizacaoOutrosAnos,
  mesmasDoObjeto, progressaoEI, rotaDe, versao,
} from './dados';
import type { AprendizagemResolvida } from './dados';

/** URL da versão markdown de um código (a página HTML sem a barra final + .md). */
export function urlMd(codigo: string): string {
  return SITE + rotaDe(codigo).replace(/\/$/, '') + '.md';
}

function linhaRelacao(h: AprendizagemResolvida, rotulo: string): string {
  return `- [${h.codigo}](${urlMd(h.codigo)}) (${rotulo}): ${h.texto}`;
}

export function aprendizagemParaMd(reg: AprendizagemResolvida): string {
  const etapa = ETAPAS[reg.etapa];
  const v = versao();
  const paginaPdf = reg.fonte.localizador_pdf?.match(/página PDF (\d+)/)?.[1];
  const nomes = (reg.organizacao?.nomes ?? {}) as Record<string, string | string[]>;
  const tipo = reg.etapa === 'EI' ? 'objetivo de aprendizagem e desenvolvimento' : 'habilidade';

  const front: string[] = [
    '---',
    `codigo: ${reg.codigo}`,
    `tipo: ${tipo}`,
    `etapa: ${etapa.nome}`,
  ];
  if (reg.anos) front.push(`anos: [${reg.anos.join(', ')}]`);
  if (reg.grupoEtario) front.push(`grupo_etario: ${GRUPOS_EI_ROTULOS[reg.grupoEtario]}`);
  if (reg.campoExperiencias) front.push(`campo_experiencias: ${reg.campoExperiencias.nome}`);
  if (reg.componente) front.push(`componente: ${reg.componente.nome}`);
  if (reg.area) front.push(`area: ${reg.area.nome}`);
  front.push(
    `versao_dados: ${v.data_version}`,
    `licenca: CC BY 4.0`,
    `url: ${SITE}${rotaDe(reg.codigo)}`,
    `fonte: ${paginaPdf ? `documento homologado do MEC, p. ${paginaPdf} do PDF` : 'planilhas oficiais do MEC'}`,
    `citacao_sugerida: "${reg.codigo} · BNCC (${v.data_version}) · ${SITE}${rotaDe(reg.codigo)}"`,
    '---',
  );

  const corpo: string[] = [
    '',
    `# ${reg.codigo}`,
    '',
    `> ${reg.texto}`,
    '',
    '## Contexto',
    '',
  ];
  const meta: string[] = [`- Etapa: ${etapa.nome}`];
  if (reg.anos) meta.push(`- Anos: ${reg.anos.map((a) => `${a}º`).join(' e ')} (Ensino Fundamental)`);
  if (reg.etapa === 'EM') meta.push('- Séries: 1ª a 3ª (as habilidades do Ensino Médio não têm seriação na BNCC)');
  if (reg.grupoEtario) meta.push(`- Grupo etário: ${GRUPOS_EI_ROTULOS[reg.grupoEtario]}`);
  if (reg.campoExperiencias) meta.push(`- Campo de experiências: ${reg.campoExperiencias.nome}`);
  if (reg.componente) meta.push(`- Componente curricular: ${reg.componente.nome}`);
  if (reg.area) meta.push(`- Área do conhecimento: ${reg.area.nome}`);
  if (nomes.camposAtuacao) meta.push(`- Campo de atuação: ${(nomes.camposAtuacao as string[]).join(' · ')}`);
  if (nomes.praticaLinguagem) meta.push(`- Prática de linguagem: ${nomes.praticaLinguagem}`);
  if (nomes.unidadeTematica) meta.push(`- Unidade temática: ${nomes.unidadeTematica}`);
  if (nomes.eixo) meta.push(`- Eixo: ${nomes.eixo}`);
  if (reg.objetosConhecimento?.length) meta.push(`- Objeto(s) de conhecimento: ${reg.objetosConhecimento.map((o) => o.nome).join(' · ')}`);
  if (reg.competenciasEspecificas?.length) meta.push(`- Competência(s) específica(s): ${reg.competenciasEspecificas.map((c) => `CE ${c.numero} (${SITE}/competencia/${c.id}/)`).join(' · ')}`);
  corpo.push(...meta);

  const doObjeto = mesmasDoObjeto(reg);
  if (doObjeto.length) {
    corpo.push('', '## No mesmo objeto de conhecimento', '');
    corpo.push(...doObjeto.map((h) => linhaRelacao(h, h.anos!.map((a) => `${a}º`).join('–') + ' ano')));
  }
  const outrosAnos = mesmaOrganizacaoOutrosAnos(reg);
  if (outrosAnos.length) {
    corpo.push('', `## Em outros anos, na mesma ${nomes.praticaLinguagem ? 'prática de linguagem' : 'unidade temática'}`, '');
    corpo.push('Aproximação estrutural: a BNCC não define progressão formal entre habilidades.', '');
    corpo.push(...outrosAnos.map((h) => linhaRelacao(h, h.anos!.map((a) => `${a}º`).join('–') + ' ano')));
  }
  const daCompetencia = mesmaCompetenciaEM(reg);
  if (daCompetencia.length) {
    corpo.push('', '## Vinculadas à mesma competência específica', '');
    corpo.push(...daCompetencia.map((h) => linhaRelacao(h, h.componente ? h.componente.nome : 'área')));
  }
  if (reg.etapa === 'EI') {
    const progressao = progressaoEI(reg.codigo);
    if (progressao) {
      corpo.push('', '## Progressão entre as faixas etárias (relação oficial, p. 26 do documento)', '');
      corpo.push(...progressao.objetivos
        .filter((o: AprendizagemResolvida) => o.codigo !== reg.codigo)
        .map((o: AprendizagemResolvida) => linhaRelacao(o, GRUPOS_EI_ROTULOS[o.grupoEtario!].split(' (')[0])));
    }
  }

  corpo.push(
    '',
    '## Fonte e licença',
    '',
    `Texto oficial conferido contra o documento homologado da BNCC${paginaPdf ? ` (p. ${paginaPdf} do PDF)` : ''}. ` +
    `Dados ${v.data_version} sob CC BY 4.0; ao usar, cite a fonte para permitir conferência. ` +
    `Formato sugerido: "${reg.codigo} · BNCC (${v.data_version}) · ${SITE}${rotaDe(reg.codigo)}". ` +
    `Registro em JSON: https://api.bncc.dev/v1/aprendizagens/${reg.codigo}. ` +
    `Dataset completo: ${SITE}/llms-full.txt`,
    '',
  );

  return front.join('\n') + corpo.join('\n');
}

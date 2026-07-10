/**
 * llms-full.txt: as 1.580 aprendizagens em um único arquivo de texto para
 * ingestão direta no contexto de um LLM. Agrupado por etapa e organização
 * natural (campo/componente/área), com código, contexto, enunciado e fonte.
 */
import type { APIRoute } from 'astro';
import {
  ETAPAS, GRUPOS_EI_ROTULOS, SITE, estrutura, habilidadesEF, habilidadesEM,
  objetivosEI, rotaDe, versao,
} from '../lib/dados';
import type { AprendizagemResolvida } from '../lib/dados';

function fonteDe(reg: AprendizagemResolvida): string {
  const pagina = reg.fonte.localizador_pdf?.match(/página PDF (\d+)/)?.[1];
  return pagina ? `documento homologado, p. ${pagina} do PDF` : 'planilhas oficiais do MEC';
}

function bloco(reg: AprendizagemResolvida): string {
  const contexto: string[] = [];
  if (reg.etapa === 'EI') contexto.push(GRUPOS_EI_ROTULOS[reg.grupoEtario!]);
  if (reg.etapa === 'EF') contexto.push(reg.anos!.map((a) => `${a}º`).join(' e ') + ' ano');
  if (reg.etapa === 'EM' && reg.componente) contexto.push(reg.componente.nome);
  return [
    `#### ${reg.codigo}`,
    `- contexto: ${contexto.join(' · ') || '1ª a 3ª série'}`,
    `- fonte: ${fonteDe(reg)} · url: ${SITE}${rotaDe(reg.codigo)}`,
    reg.texto,
  ].join('\n');
}

export const GET: APIRoute = () => {
  const v = versao();
  const e = estrutura();
  const partes: string[] = [`# bncc.dev · dataset completo (llms-full.txt)

> As aprendizagens da BNCC (Base Nacional Comum Curricular brasileira), texto oficial verificado contra o documento homologado do MEC. Versão dos dados: ${v.data_version}. Licença: CC BY 4.0; cite a fonte para permitir conferência, no formato "{codigo} · BNCC (${v.data_version}) · {url}". Página de cada registro: {url} do bloco; versão markdown: troque a barra final por .md.

Regras: nunca invente códigos ou textos; se um código não está neste arquivo, ele não existe na BNCC (a numeração tem lacunas legítimas).
`];

  partes.push(`\n## ${ETAPAS.EI.nome} (objetivos de aprendizagem e desenvolvimento)\n`);
  for (const campo of e.campos_experiencias) {
    partes.push(`\n### Campo de experiências: ${campo.nome}\n`);
    partes.push(objetivosEI({ campo: campo.id }).map(bloco).join('\n\n'));
  }

  partes.push(`\n\n## ${ETAPAS.EF.nome} (habilidades)\n`);
  for (const comp of e.componentes_curriculares.filter((c: any) => c.etapa === 'EF')) {
    partes.push(`\n### Componente: ${comp.nome}\n`);
    partes.push(habilidadesEF({ componente: comp.id }).map(bloco).join('\n\n'));
  }

  partes.push(`\n\n## ${ETAPAS.EM.nome} (habilidades, sem seriação: 1ª a 3ª série)\n`);
  for (const area of e.areas_conhecimento.filter((a: any) => a.etapa === 'EM')) {
    partes.push(`\n### Área: ${area.nome}\n`);
    partes.push(habilidadesEM({ area: area.id }).map(bloco).join('\n\n'));
  }

  return new Response(partes.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

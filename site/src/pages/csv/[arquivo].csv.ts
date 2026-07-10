/**
 * CSVs estáticos das listagens, gerados no build: um por etapa completa,
 * por componente do EF (e por ano), por área do EM e por campo da EI.
 * URLs: /csv/{arquivo}.csv (ex.: /csv/fundamental-lp-6ano.csv).
 */
import type { APIRoute } from 'astro';
import { estrutura, habilidadesEF } from '../../lib/dados';
import { csvEF, csvEM, csvEI } from '../../lib/csv';

type Gerador = () => string;

function catalogo(): Map<string, Gerador> {
  const arquivos = new Map<string, Gerador>();
  const e = estrutura();

  arquivos.set('fundamental', () => csvEF());
  arquivos.set('medio', () => csvEM());
  arquivos.set('infantil', () => csvEI());

  for (const c of e.componentes_curriculares.filter((c) => c.etapa === 'EF')) {
    const slug = c.id.replace('ef-comp-', '');
    arquivos.set(`fundamental-${slug}`, () => csvEF({ componente: c.id }));
    const anos = [...new Set(habilidadesEF({ componente: c.id }).flatMap((h) => h.anos!))];
    for (const ano of anos) {
      arquivos.set(`fundamental-${slug}-${ano}ano`, () => csvEF({ componente: c.id, ano }));
    }
  }
  for (const a of e.areas_conhecimento.filter((a) => a.etapa === 'EM')) {
    arquivos.set(`medio-${a.id.replace('em-area-', '')}`, () => csvEM({ area: a.id }));
  }
  for (const c of e.campos_experiencias) {
    arquivos.set(`infantil-${c.id.replace('ei-campo-', '')}`, () => csvEI({ campo: c.id }));
  }
  return arquivos;
}

export function getStaticPaths() {
  return [...catalogo().keys()].map((arquivo) => ({ params: { arquivo } }));
}

export const GET: APIRoute = ({ params }) => {
  const gerar = catalogo().get(params.arquivo!)!;
  return new Response(gerar(), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};

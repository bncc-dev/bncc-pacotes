import type { APIRoute } from 'astro';
import { objetivosEI, porCodigo } from '../../lib/dados';
import { aprendizagemParaMd } from '../../lib/markdown';

export function getStaticPaths() {
  return objetivosEI().map((o) => ({ params: { codigo: o.codigo } }));
}

export const GET: APIRoute = ({ params }) => {
  const reg = porCodigo(params.codigo!);
  return new Response(aprendizagemParaMd(reg), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

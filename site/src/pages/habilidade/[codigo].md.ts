import type { APIRoute } from 'astro';
import { habilidadesEF, habilidadesEM, porCodigo } from '../../lib/dados';
import { aprendizagemParaMd } from '../../lib/markdown';

export function getStaticPaths() {
  return [...habilidadesEF(), ...habilidadesEM()].map((h) => ({ params: { codigo: h.codigo } }));
}

export const GET: APIRoute = ({ params }) => {
  const reg = porCodigo(params.codigo!);
  return new Response(aprendizagemParaMd(reg), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

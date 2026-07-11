import type { APIRoute } from 'astro';
import { objetivosEI, porCodigo } from '../../lib/dados';
import { aprendizagemParaMd } from '../../lib/markdown';
import { aprendizagemCOParaMd, aprendizagensCO, ehComputacao, porCodigoCO } from '../../lib/computacao';

export function getStaticPaths() {
  return [
    ...objetivosEI().map((o) => ({ params: { codigo: o.codigo } })),
    ...aprendizagensCO().filter((a) => a.etapa === 'EI').map((a) => ({ params: { codigo: a.codigo } })),
  ];
}

export const GET: APIRoute = ({ params }) => {
  const codigo = params.codigo!;
  const md = ehComputacao(codigo)
    ? aprendizagemCOParaMd(porCodigoCO(codigo)!)
    : aprendizagemParaMd(porCodigo(codigo));
  return new Response(md, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};

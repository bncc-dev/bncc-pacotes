/**
 * Índice compacto para a busca client-side (/buscar/): uma linha por
 * aprendizagem, campos de 1 letra para reduzir o peso. Gerado no build a
 * partir do @bncc/dados; carregado sob demanda pela página de busca.
 *
 * Campos: c código · t texto · e etapa · g grupo (componente/área/campo) ·
 * a anos (só EF) · p prática, unidade temática ou eixo (EF) / grupo etário (EI)
 */
import type { APIRoute } from 'astro';
import { GRUPOS_EI_ROTULOS, todasAprendizagens } from '../lib/dados';
import { aprendizagensCO } from '../lib/computacao';

export const GET: APIRoute = () => {
  const itens = todasAprendizagens().map((reg) => {
    if (reg.etapa === 'EI') {
      return {
        c: reg.codigo, t: reg.texto, e: 'EI',
        g: reg.campoExperiencias!.nome,
        p: GRUPOS_EI_ROTULOS[reg.grupoEtario!] ?? reg.grupoEtario,
      };
    }
    if (reg.etapa === 'EF') {
      const nomes = reg.organizacao!.nomes as Record<string, string | string[]>;
      return {
        c: reg.codigo, t: reg.texto, e: 'EF',
        g: reg.componente!.nome,
        a: reg.anos,
        p: (nomes.praticaLinguagem ?? nomes.unidadeTematica ?? nomes.eixo ?? null) as string | null,
      };
    }
    return {
      c: reg.codigo, t: reg.texto, e: 'EM',
      g: reg.area!.nome,
      p: reg.componente ? 'Língua Portuguesa' : null,
    };
  });
  const itensCO = aprendizagensCO().map((reg) => ({
    c: reg.codigo, t: reg.texto, e: reg.etapa,
    g: 'Computação',
    ...(reg.anos ? { a: reg.anos } : {}),
    p: reg.eixo?.nome ?? (reg.competencia ? `Competência ${reg.competencia.numero} do EM` : null),
  }));
  return new Response(JSON.stringify([...itens, ...itensCO]), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

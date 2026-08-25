/**
 * As 7 tools do servidor MCP da BNCC — casca fina sobre @bncc/dados.
 * As descrições são produto: escritas para o agente decidir quando e como usar.
 *
 * Runtime-agnóstico: recebe as consultas injetadas (tipo Consultas do núcleo),
 * então roda tanto no stdio (casca fs do @bncc/dados) quanto em Workers
 * (criarConsultas + JSONs importados como módulos).
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { decodificar } from '@bncc/dados/nucleo';
import type { Consultas } from '@bncc/dados/nucleo';
import type { Versao } from '@bncc/dados';

const json = (dados: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(dados, null, 1) }] });
const erro = (e: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify({ erro: e instanceof Error ? e.message : String(e) }) }],
  isError: true,
});

/** Versão compacta de um registro para listagens (não inunda o contexto do agente). */
function compacto(r: ReturnType<Consultas['porCodigo']>) {
  return {
    codigo: r.codigo,
    etapa: r.etapa,
    texto: r.texto,
    ...(r.componente ? { componente: r.componente.nome } : {}),
    ...(r.area ? { area: r.area.nome } : {}),
    ...(r.anos ? { anos: r.anos } : {}),
    ...(r.campoExperiencias ? { campo: r.campoExperiencias.nome, grupo: r.grupoEtario } : {}),
    ...(r.eixo ? { eixo: r.eixo.nome, ...(r.grupoEtario ? { grupo: r.grupoEtario } : {}) } : {}),
  };
}

function limitar<T>(itens: T[], limite: number) {
  return { total: itens.length, exibindo: Math.min(itens.length, limite), resultados: itens.slice(0, limite) };
}

/** Instruções do servidor, com contagem dinâmica do dataset e a versão dos dados. */
export function instrucoesServidor(bncc: Consultas, dataVersion: string): string {
  const total = bncc.estatisticas().total.toLocaleString('pt-BR');
  return `Dados oficiais e verificados da BNCC (Base Nacional Comum Curricular brasileira): ${total} aprendizagens das três etapas, cada uma com fonte oficial (página do PDF homologado).
Regras: (1) nunca invente códigos ou textos de habilidade; se um código não está nos dados, ele não existe na BNCC; (2) a numeração tem lacunas legítimas; (3) ao citar uma aprendizagem para o usuário, inclua o código e, quando relevante, a fonte.
Etapas: EI (objetivos por campo de experiências e grupo etário), EF (habilidades por componente e ano), EM (habilidades por área, sem seriação). Códigos: EI02TS01, EF67LP08, EM13LGG103.
O complemento de Computação (anexo ao Parecer CNE/CEB 2/2022, vigente e oficial) está incluído: códigos CO nas três etapas (ex.: EI03CO01, EF03CO05, EF15CO01, EM13CO26), organizados por eixo (Pensamento Computacional, Mundo Digital, Cultura Digital).
Versão dos dados: ${dataVersion}.`;
}

export function registrarTools(servidor: McpServer, bncc: Consultas, versao: Versao): void {
  servidor.registerTool('bncc_lookup', {
    title: 'Buscar aprendizagem por código',
    description: 'Retorna o registro completo e verificado de uma aprendizagem da BNCC pelo código (ex.: "EF67LP08", "EI02TS01", "EM13LGG103", "EF03CO05" do complemento de Computação; aceita minúsculas). Inclui texto oficial, contexto pedagógico resolvido (componente, unidade temática/prática, objetos de conhecimento, competências) e a fonte oficial com página do PDF homologado. Use sempre que o usuário mencionar um código ou quando precisar do enunciado exato: nunca cite de memória.',
    inputSchema: { codigo: z.string().describe('Código BNCC, ex.: EF67LP08') },
  }, async ({ codigo }) => {
    try { return json(bncc.porCodigo(codigo)); } catch (e) { return erro(e); }
  });

  servidor.registerTool('bncc_buscar', {
    title: 'Busca textual nos enunciados',
    description: 'Busca um termo nos textos oficiais das aprendizagens (normalizada: acentos e maiúsculas não importam). Use para encontrar habilidades sobre um tema (ex.: texto="frações", componente="MA"). Retorna {total, exibindo, resultados}; se total > exibindo, refine os filtros ou aumente o limite. Componentes do EF: LP, AR, EF, LI, MA, CI, GE, HI, ER e CO (Computação). O complemento de Computação (códigos CO) entra na busca por padrão; componente="CO" restringe às habilidades EF de Computação. Para localizar o código de um enunciado, envie o enunciado completo, sem filtros.',
    inputSchema: {
      texto: z.string().describe('Termo a buscar nos enunciados'),
      etapa: z.enum(['EI', 'EF', 'EM']).optional(),
      componente: z.string().optional().describe('Sigla do componente do EF, ex.: MA, LP, CO'),
      ano: z.number().int().min(1).max(9).optional(),
      limite: z.number().int().min(1).max(100).default(20),
    },
  }, async ({ texto, etapa, componente, ano, limite }) => {
    try { return json(limitar(bncc.buscar(texto, { etapa, componente, ano }).map(compacto), limite)); }
    catch (e) { return erro(e); }
  });

  servidor.registerTool('bncc_listar', {
    title: 'Listar aprendizagens por filtros estruturados',
    description: 'Lista aprendizagens de uma etapa com filtros estruturados (sem busca textual). EF: componente (sigla, ex.: LP) e/ou ano (1-9). EM: area (LGG, MAT, CNT, CHS) e/ou competencia (número) e/ou apenas_lp. EI: campo (EO, CG, TS, EF, ET) e/ou grupo_etario (01, 02, 03). Computação: componente=CO (EF), area=CO (EM) ou campo=CO (EI). Use para cobertura curricular ("todas as habilidades do 4º ano de Matemática") e navegação. Retorna {total, exibindo, resultados}.',
    inputSchema: {
      etapa: z.enum(['EI', 'EF', 'EM']),
      componente: z.string().optional().describe('EF: sigla do componente (LP, MA, CI...)'),
      ano: z.number().int().min(1).max(9).optional().describe('EF: ano'),
      area: z.string().optional().describe('EM: LGG, MAT, CNT ou CHS'),
      competencia: z.number().int().optional().describe('EM: número da competência específica da área'),
      apenas_lp: z.boolean().optional().describe('EM: só habilidades de Língua Portuguesa'),
      campo: z.string().optional().describe('EI: sigla do campo de experiências (EO, CG, TS, EF, ET)'),
      grupo_etario: z.string().optional().describe('EI: 01 (bebês), 02 (bem pequenas), 03 (pequenas)'),
      limite: z.number().int().min(1).max(200).default(50),
    },
  }, async ({ etapa, componente, ano, area, competencia, apenas_lp, campo, grupo_etario, limite }) => {
    try {
      const itens = etapa === 'EF' ? bncc.habilidadesEF({ componente, ano })
        : etapa === 'EM' ? bncc.habilidadesEM({ area, competencia, apenasLP: apenas_lp })
        : bncc.objetivosEI({ campo, grupoEtario: grupo_etario });
      return json(limitar(itens.map(compacto), limite));
    } catch (e) { return erro(e); }
  });

  servidor.registerTool('bncc_decodificar', {
    title: 'Decodificar a estrutura de um código',
    description: 'Explica a anatomia de um código BNCC sem consultar o dataset: etapa, ano(s) ou bloco, componente/área, competência embutida (EM) e sequência; códigos CO do complemento de Computação também. Funciona para qualquer código gramaticalmente válido, mesmo que não exista (atenção: existência se confere com bncc_lookup). Use para validar/explicar códigos que o usuário digitou.',
    inputSchema: { codigo: z.string().describe('Código BNCC a decodificar') },
  }, async ({ codigo }) => {
    try { return json(decodificar(codigo)); } catch (e) { return erro(e); }
  });

  servidor.registerTool('bncc_progressao_ei', {
    title: 'Progressão da Educação Infantil entre faixas etárias',
    description: 'Dado um objetivo da Educação Infantil (ex.: EI02TS01), retorna os objetivos do MESMO aspecto nas três faixas etárias (bebês, crianças bem pequenas, crianças pequenas) — o alinhamento horizontal oficial da BNCC (p. 26). Use para planejar continuidade/adaptação entre faixas. Só existe para códigos EI.',
    inputSchema: { codigo: z.string().describe('Código EI, ex.: EI02TS01') },
  }, async ({ codigo }) => {
    try { return json(bncc.progressaoEI(codigo)); } catch (e) { return erro(e); }
  });

  servidor.registerTool('bncc_estrutura', {
    title: 'Estrutura do sistema educacional',
    description: 'Retorna as coleções estruturais da BNCC: etapas, áreas do conhecimento, componentes curriculares (com quem tem habilidades próprias), competências gerais (10), competências específicas (105), recortes temporais, campos de experiências e modalidades (EJA). Sem argumento, retorna o índice de coleções disponíveis com contagens.',
    inputSchema: {
      colecao: z.enum(['etapas', 'areas_conhecimento', 'componentes_curriculares', 'competencias_gerais',
        'competencias_especificas', 'recortes_temporais', 'campos_experiencias', 'modalidades']).optional(),
    },
  }, async ({ colecao }) => {
    try {
      const e = bncc.estrutura();
      if (!colecao) {
        return json(Object.fromEntries(Object.entries(e).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])));
      }
      return json(e[colecao as keyof typeof e]);
    } catch (er) { return erro(er); }
  });

  servidor.registerTool('bncc_estatisticas', {
    title: 'Contagens e versão do dataset',
    description: 'Contagens do dataset (total de aprendizagens por etapa, competências, alinhamentos) e a versão dos dados embutidos (data-version, commit de origem). Use para sanidade e para citar a versão do dado.',
    inputSchema: {},
  }, async () => {
    try { return json({ ...bncc.estatisticas(), versao }); } catch (e) { return erro(e); }
  });
}

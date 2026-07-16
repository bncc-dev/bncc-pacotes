import type { APIRoute } from 'astro';
import { SITE, estatisticas, versao } from '../lib/dados';
import { estatisticasCO } from '../lib/computacao';

export const GET: APIRoute = () => {
  const s = estatisticas();
  const sCO = estatisticasCO();
  const total = s.total + sCO.total;
  const v = versao();
  const corpo = `# bncc.dev

> A BNCC (Base Nacional Comum Curricular brasileira) em dados abertos, rastreáveis e acessíveis: ${total.toLocaleString('pt-BR')} aprendizagens com fonte oficial (${s.total.toLocaleString('pt-BR')} da BNCC 2018 + ${sCO.total} do complemento de Computação, Parecer CNE/CEB 2/2022). Versão dos dados: ${v.data_version}. Licença dos dados: CC BY 4.0; código: MIT. Tudo aberto, sem API key e sem cadastro.

Regras para agentes:
- Nunca invente códigos ou textos de habilidade. Se uma página não existe em bncc.dev, o código não existe na BNCC (a numeração oficial tem lacunas legítimas).
- Cada página traz o texto oficial conferido contra o documento homologado, com a página do PDF.
- Cite sempre pelo código + URL permanente, para que qualquer pessoa confira contra o documento homologado: ${SITE}/habilidade/{CODIGO}/ (Fundamental e Médio) e ${SITE}/objetivo/{CODIGO}/ (Educação Infantil). Formato sugerido: "EF67LP08 · BNCC (${v.data_version}) · ${SITE}/habilidade/EF67LP08/".
- Toda página de aprendizagem tem versão markdown: troque a barra final por .md (ex.: ${SITE}/habilidade/EF67LP08.md).
- Gramática dos códigos (ex.: EF67LP08 = etapa EF + anos 6-7 + Língua Portuguesa + sequência 08): decodificação em cada página ou via API /v1/decodificar/{codigo}.

## Dados completos

- [llms-full.txt](${SITE}/llms-full.txt): as ${total.toLocaleString('pt-BR')} aprendizagens em um único arquivo de texto (código, contexto, enunciado oficial, fonte), para ingestão direta em contexto
- [CSV da Educação Infantil](${SITE}/csv/infantil.csv): ${s.educacaoInfantil} objetivos
- [CSV do Ensino Fundamental](${SITE}/csv/fundamental.csv): ${s.ensinoFundamental.toLocaleString('pt-BR')} habilidades
- [CSV do Ensino Médio](${SITE}/csv/medio.csv): ${s.ensinoMedio} habilidades
- Recortes em CSV por listagem: ${SITE}/csv/{etapa}.csv, ${SITE}/csv/fundamental-{componente}-{ano}ano.csv etc.

## Navegação

- [Educação Infantil](${SITE}/infantil/): ${s.educacaoInfantil} objetivos por campo de experiências
- [Ensino Fundamental](${SITE}/fundamental/): ${s.ensinoFundamental} habilidades por componente e ano
- [Ensino Médio](${SITE}/medio/): ${s.ensinoMedio} habilidades por área
- [Computação](${SITE}/computacao/): as ${sCO.total} aprendizagens do complemento à BNCC (códigos CO), por eixo e objeto de conhecimento
- [Competências](${SITE}/competencias/): as 10 competências gerais e as ${s.competenciasEspecificas} específicas (páginas em ${SITE}/competencia/{id}/)
- [Buscar](${SITE}/buscar/): busca textual com filtros por etapa, componente, ano e prática
- [Para quem ensina](${SITE}/ensina/): guia para professores; busca por tema, citação com link permanente, prompts para IA e CSVs
- [Para quem desenvolve](${SITE}/desenvolve/): quickstart de npm, PyPI, MCP e API REST, modelo de dados e garantias de engenharia
- [Benchmark de alucinação](${SITE}/benchmark/): medição de quanto os modelos de IA inventam a BNCC sem fonte de consulta; leaderboard completo em ${SITE}/benchmark/leaderboard/
- [Sobre](${SITE}/sobre/): metodologia e mantenedores
- [Contato](${SITE}/contato/): formulário e contato@bncc.dev; correções de dados vão por issue no GitHub, com fonte oficial

## API e pacotes

- [API REST aberta](https://api.bncc.dev): sem key; lookup, busca, filtros, decodificador
- [OpenAPI 3.1](https://api.bncc.dev/v1/openapi.json): especificação completa da API
- [Apresentação da API](${SITE}/api/): rotas, exemplos e limites
- [@bncc/dados (npm)](https://www.npmjs.com/package/@bncc/dados): dados embutidos, tipados, offline
- [bncc (PyPI)](https://pypi.org/project/bncc/): o mesmo dataset em Python, com integração pandas
- [Servidor MCP](${SITE}/mcp/): conectar Claude, ChatGPT ou Cursor à BNCC (URL de conexão: https://mcp.bncc.dev/mcp); local via npx -y @bncc/mcp

## Confiança e proveniência

- [Dados brutos e metodologia](https://github.com/bncc-dev/bncc-dados): extração reprodutível, validação em CI
- [Decisões de interpretação](https://github.com/bncc-dev/bncc-dados/blob/main/DECISOES.md): divergências entre fontes oficiais, documentadas uma a uma
- [Changelog dos dados](https://github.com/bncc-dev/bncc-dados/blob/main/CHANGELOG.md): o que mudou em cada versão

## Optional

- [Repositório dos pacotes e do site](https://github.com/bncc-dev/bncc-pacotes)
- [Reportar erro em um registro](https://github.com/bncc-dev/bncc-dados/issues/new)
`;
  return new Response(corpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

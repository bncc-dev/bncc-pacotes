# bncc-pacotes

Monorepo das interfaces para máquina do bncc.dev (Fase 2): o dataset [bncc-dados](https://github.com/bncc-dev/bncc-dados) consumível em uma linha.

| Pacote | O que é | Estado |
|---|---|---|
| `packages/bncc` | Pacote npm @bncc/dados: dados embutidos + API de consulta tipada em português | M1 pronto (aguarda publicação) |
| `packages/mcp` | Servidor MCP @bncc/mcp (7 tools, casca sobre @bncc/dados), via npx | M2 pronto (aguarda publicação) |
| `python/` | Pacote PyPI bncc: API equivalente em snake_case, paridade provada pelas mesmas fixtures | M3 pronto (aguarda publicação) |

Os dados embutidos são sincronizados de um commit específico do bncc-dados por `scripts/sincronizar-dados.mjs`, com data-version e checksums registrados em `dados/VERSAO.json` de cada pacote.

Publicação nos registries: gateada na release `dados-v1.0.0` (revisão pedagógica registrada). Plano completo da fase: repositório de planejamento do projeto.

Licenças: código MIT; dados embutidos CC BY 4.0.

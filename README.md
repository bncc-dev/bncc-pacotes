# bncc-pacotes

Monorepo das interfaces para máquina do bncc.dev (Fase 2): o dataset [bncc-dados](https://github.com/bncc-dev/bncc-dados) consumível em uma linha.

| Pacote | O que é | Estado |
|---|---|---|
| `packages/bncc` | Pacote npm @bncc/dados: dados embutidos + API de consulta tipada em português | M1 em desenvolvimento |
| `packages/mcp` | Servidor MCP (casca sobre o pacote bncc), via npx | M2 planejado |
| `python/` | Pacote PyPI com API equivalente e paridade testada | M3 planejado |

Os dados embutidos são sincronizados de um commit específico do bncc-dados por `scripts/sincronizar-dados.mjs`, com data-version e checksums registrados em `dados/VERSAO.json` de cada pacote.

Publicação nos registries: gateada na release `dados-v1.0.0` (revisão pedagógica registrada). Plano completo da fase: repositório de planejamento do projeto.

Licenças: código MIT; dados embutidos CC BY 4.0.

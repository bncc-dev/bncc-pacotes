# bncc-pacotes

Monorepo das interfaces para máquina do bncc.dev (Fase 2): o dataset [bncc-dados](https://github.com/bncc-dev/bncc-dados) consumível em uma linha.

| Pacote | O que é | Estado |
|---|---|---|
| `packages/bncc` | Pacote npm @bncc/dados: dados embutidos + API de consulta tipada em português | **npm: `@bncc/dados@0.1.0` publicado** |
| `packages/mcp` | Servidor MCP @bncc/mcp (7 tools, casca sobre @bncc/dados), via npx | **npm: `@bncc/mcp@0.1.1` publicado** (`npx -y @bncc/mcp`) |
| `python/` | Pacote PyPI bncc: API equivalente em snake_case, paridade provada pelas mesmas fixtures | **PyPI: `bncc 0.1.0` publicado** (`pip install bncc`) |
| [`site/`](site/README.md) | bncc.dev: 1.679 páginas estáticas (uma por aprendizagem + navegação), design dos mocks aprovados, temas claro/escuro | M4 pronto (deploy na release) |

Os dados embutidos são sincronizados de um commit específico do bncc-dados por `scripts/sincronizar-dados.mjs`, com data-version e checksums registrados em `dados/VERSAO.json` de cada pacote.

Pré-releases `0.1.x` publicadas em 09/07/2026 (npm e PyPI). O marco `1.0.0` continua condicionado à release `dados-v1.0.0` do bncc-dados (revisão pedagógica registrada).

## Documentação

| Documento | Para quê |
|---|---|
| [docs/arquitetura.md](docs/arquitetura.md) | O desenho do monorepo: fluxo de dados pinado, os três pacotes, decisões e fluxo de versão |
| [docs/manutencao.md](docs/manutencao.md) | Runbook: atualizar dados, mudar API (nos dois pacotes), tools do MCP, publicar, troubleshooting |
| [docs/paridade.md](docs/paridade.md) | O contrato das consultas douradas que impede npm e PyPI de divergirem |
| [AGENTS.md](AGENTS.md) | Regras para agentes de IA trabalhando neste repo |

Licenças: código MIT; dados embutidos CC BY 4.0.

[Português](README.md) · **English**

# [bncc.dev](https://bncc.dev) · packages, MCP and query API

[![CI](https://github.com/bncc-dev/bncc-pacotes/actions/workflows/ci.yml/badge.svg)](https://github.com/bncc-dev/bncc-pacotes/actions/workflows/ci.yml)
[![npm @bncc/dados](https://img.shields.io/npm/v/@bncc/dados?label=npm%20%40bncc%2Fdados)](https://www.npmjs.com/package/@bncc/dados)
[![PyPI bncc](https://img.shields.io/pypi/v/bncc?label=PyPI%20bncc)](https://pypi.org/project/bncc/)
[![Code: MIT](https://img.shields.io/badge/code-MIT-green.svg)](LICENSE-CODIGO.md)
[![Data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-lightgrey.svg)](LICENSE-DADOS.md)

Brazil's National Common Curricular Base (BNCC), usable in one line of code. The
1,721 learning objectives of Brazilian basic education, verified against the
official documents of the Ministry of Education (MEC) and the National Education
Council (CNE), as an npm package, a PyPI package and an MCP server for AI agents.
Embedded data and zero network: queries run on your machine. `@bncc/dados` and
`bncc` (PyPI) have no runtime dependencies; `@bncc/mcp` uses the official MCP
SDK (MIT) and `zod` (MIT).

The dataset does not originate here. It comes from [bncc-dados](https://github.com/bncc-dev/bncc-dados).
This repository is the **machine interfaces** for that dataset.

## Quick start

```bash
npx -y @bncc/mcp          # servidor MCP: a BNCC ao alcance do seu agente de IA
npm install @bncc/dados   # TypeScript / JavaScript
pip install bncc          # Python
```

**TypeScript**

```ts
import { porCodigo, habilidadesEF, buscar, decodificar } from '@bncc/dados';

const h = porCodigo('EF67LP08');
h.texto;                               // enunciado oficial verificado
h.organizacao.nomes.praticaLinguagem;  // 'Leitura'
h.fonte.localizador_pdf;               // 'Base-Nacional-Comum-Curricular-BNCC.pdf, página PDF 167'

habilidadesEF({ componente: 'LP', ano: 6, pratica: 'Leitura' });  // 37 habilidades
buscar('frações', { etapa: 'EF', componente: 'MA' });             // 22 resultados, por relevância
decodificar('EM13LGG103');  // { etapa: 'EM', area: 'LGG', competenciaEspecifica: 1, sequencia: 3, ... }
```

**Python**, the same semantics, following each ecosystem's conventions:

```python
from bncc import por_codigo, habilidades_ef, buscar, decodificar

por_codigo('EF67LP08')['texto']
habilidades_ef(componente='LP', ano=6, pratica='Leitura')  # 37
decodificar('EI02TS01')  # {'etapa': 'EI', 'campo_experiencias': 'TS', ...}
```

That both give identical answers is not a promise: the same golden queries
[test it on every commit](docs/paridade.md) (in Portuguese).

## MCP server

Seven tools (`bncc_lookup`, `bncc_buscar`, `bncc_listar`, `bncc_decodificar`,
`bncc_estatisticas`, `bncc_estrutura`, `bncc_progressao_ei`) that give the agent
the verified BNCC, with the official source in every response. Codes that do not
exist get an error explaining that a well-formed code absent from the data does
not exist in the BNCC, instead of a `null` that invites hallucination.

**Local**, without a permanent install:

```json
{ "mcpServers": { "bncc": { "command": "npx", "args": ["-y", "@bncc/mcp"] } } }
```

**Hosted**, with no install at all and no API key: `https://mcp.bncc.dev`
(streamable HTTP).

The hosted server runs on Cloudflare Workers, with its code in
[`mcp-worker/`](mcp-worker/), also under MIT. The tools are the same as in the
local version, which does not depend on any external service.

How much this changes a model's answers is measured, with the raw data
published, in [bncc-benchmark](https://github.com/bncc-dev/bncc-benchmark).

## What is in this repository

| Directory | Publishes | Version |
|---|---|---|
| `packages/bncc` | npm [`@bncc/dados`](https://www.npmjs.com/package/@bncc/dados): embedded data + typed API | `0.7.0` |
| `packages/mcp` | npm [`@bncc/mcp`](https://www.npmjs.com/package/@bncc/mcp): the MCP server, via npx | `0.6.0` |
| `python/` | PyPI [`bncc`](https://pypi.org/project/bncc/): the equivalent API in snake_case | `0.5.0` |
| `mcp-worker/` | the same MCP hosted at `mcp.bncc.dev` (Cloudflare Workers) | live |

The embedded data is synced from a specific bncc-dados commit by
`scripts/sincronizar-dados.mjs`, with the data-version and checksums recorded in
each package's `dados/VERSAO.json`. Nobody edits `dados/` by hand.

Version `1.0.0` of the three packages depends on the `dados-v1.0.0` release of
bncc-dados, which brings the recorded pedagogical review.

The website (bncc.dev) and the contact form worker **do not live here**: they
moved to [bncc-site](https://github.com/bncc-dev/bncc-site) in July 2026. What
stays in this repo is what shares the dataset: see [DECISOES.md](DECISOES.md) D2.

## Development

```bash
pnpm install && pnpm -r build && pnpm -r test   # npm, MCP e worker
cd python && uv sync && uv run pytest           # PyPI
```

Node 22+, [pnpm](https://pnpm.io) (the version comes from `packageManager`) and
[uv](https://docs.astral.sh/uv/). CI runs exactly these two blocks.

Before opening a PR, read [CONTRIBUTING.md](CONTRIBUTING.md): the golden rule is
that the injectable core (`criarConsultas`) is the **only** query surface, and
PRs that reimplement lookup, search or decoding are rejected even if they pass
the tests.

## Documentation

| Document | What it is for |
|---|---|
| [docs/manual-rapido.md](docs/manual-rapido.md) (in Portuguese) | The view of those who consume the packages: recipes by use case |
| [docs/arquitetura.md](docs/arquitetura.md) (in Portuguese) | The monorepo design, the pinned data flow and the injectable core |
| [docs/paridade.md](docs/paridade.md) (in Portuguese) | The golden query contract that keeps npm and PyPI from diverging |
| [docs/manutencao.md](docs/manutencao.md) (in Portuguese) | Runbook: updating data, changing the API, publishing, troubleshooting |
| [DECISOES.md](DECISOES.md) | The non-obvious choices and why |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each published version |
| [AGENTS.md](AGENTS.md) | Rules for AI agents working in this repo |

## The ecosystem

| Repository | What it is |
|---|---|
| [bncc-dados](https://github.com/bncc-dev/bncc-dados) | The dataset: reproducible extraction, validated in CI, with per-record provenance |
| **bncc-pacotes** | This repo: npm, PyPI and MCP on top of the dataset |
| [bncc-benchmark](https://github.com/bncc-dev/bncc-benchmark) | How much LLMs hallucinate about the BNCC, and how much grounding fixes it |

## Who maintains it

bncc.dev is maintained by [Profy Tecnologias Educacionais Ltda](https://profy.com.br)
(CNPJ 53.669.787/0001-45, Brasília, Brazil), which holds the rights to the code
in this repository. Technical lead: Marcos Roberto Martins de Oliveira. Profy
runs products that use LLMs on top of the BNCC. These packages are the verified
layer those products consume, published openly so that anyone can consume the
same thing.

## Licenses

Code under **MIT**, embedded data under **CC BY 4.0**, in separate files because
the same published artifact carries both kinds of content: [LICENSE](LICENSE),
[LICENSE-CODIGO.md](LICENSE-CODIGO.md), [LICENSE-DADOS.md](LICENSE-DADOS.md).

The name "bncc.dev" and the visual identity are **not** licensed: the code is
free, the brand is not. Derivatives must not present themselves as being
bncc.dev.

Security: [SECURITY.md](SECURITY.md) (do not open a public issue).
Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

# bncc-pacotes

Monorepo das interfaces para máquina do bncc.dev (Fase 2): o dataset [bncc-dados](https://github.com/bncc-dev/bncc-dados) consumível em uma linha.

| Pacote | O que é | Estado |
|---|---|---|
| `packages/bncc` | Pacote npm @bncc/dados: dados embutidos + API de consulta tipada em português | **npm: `@bncc/dados@0.3.1`** |
| `packages/mcp` | Servidor MCP @bncc/mcp (7 tools, casca sobre @bncc/dados), via npx | **npm: `@bncc/mcp@0.1.1`** (`npx -y @bncc/mcp`). A `0.2.0` deste repo, com o export `./tools`, ainda não foi publicada |
| `mcp-worker/` | O mesmo MCP hospedado (streamable HTTP em Cloudflare Workers) | no ar em `mcp.bncc.dev`, sem instalação e sem API key |
| `python/` | Pacote PyPI bncc: API equivalente em snake_case, paridade provada pelas mesmas fixtures | **PyPI: `bncc 0.2.0`** (`pip install bncc`) |

O site e o worker do formulário de contato **não vivem mais aqui**: migraram para [bncc-dev/bncc-site](https://github.com/bncc-dev/bncc-site) em jul/2026. Fica aqui o que compartilha o dataset (ver [DECISOES.md](DECISOES.md) D2).

Os dados embutidos são sincronizados de um commit específico do bncc-dados por `scripts/sincronizar-dados.mjs`, com data-version e checksums registrados em `dados/VERSAO.json` de cada pacote.

Pré-releases `0.1.x` publicadas em 09/07/2026 (npm e PyPI). O marco `1.0.0` continua condicionado à release `dados-v1.0.0` do bncc-dados (revisão pedagógica registrada).

## Documentação

| Documento | Para quê |
|---|---|
| [docs/arquitetura.md](docs/arquitetura.md) | O desenho do monorepo: por que um repo só, fluxo de dados pinado, os três pacotes, decisões e fluxo de versão |
| [docs/manutencao.md](docs/manutencao.md) | Runbook: atualizar dados, mudar API (nos dois pacotes), tools do MCP, publicar, troubleshooting |
| [docs/paridade.md](docs/paridade.md) | O contrato das consultas douradas que impede npm e PyPI de divergirem |
| [AGENTS.md](AGENTS.md) | Regras para agentes de IA trabalhando neste repo |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir, e a regra de ouro: o núcleo injetável é a única superfície de consulta |
| [DECISOES.md](DECISOES.md) | As escolhas não óbvias e por quê (monorepo, API em português, licenças separadas) |
| [CHANGELOG.md](CHANGELOG.md) | O que mudou em cada versão publicada dos três pacotes |

## Licenças

Código **MIT**, dados embutidos **CC BY 4.0**, em arquivos separados porque o
mesmo artefato publicado carrega as duas naturezas: [LICENSE](LICENSE),
[LICENSE-CODIGO.md](LICENSE-CODIGO.md), [LICENSE-DADOS.md](LICENSE-DADOS.md).

O nome "bncc.dev" e a identidade visual **não** são licenciados: o código é
livre, a marca não. Derivados não devem se apresentar como sendo o bncc.dev.

Segurança: [SECURITY.md](SECURITY.md) (não abra issue pública).
Conduta: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

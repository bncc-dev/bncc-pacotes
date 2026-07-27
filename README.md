# [bncc.dev](https://bncc.dev) · pacotes, MCP e API de consulta

[![CI](https://github.com/bncc-dev/bncc-pacotes/actions/workflows/ci.yml/badge.svg)](https://github.com/bncc-dev/bncc-pacotes/actions/workflows/ci.yml)
[![npm @bncc/dados](https://img.shields.io/npm/v/@bncc/dados?label=npm%20%40bncc%2Fdados)](https://www.npmjs.com/package/@bncc/dados)
[![PyPI bncc](https://img.shields.io/pypi/v/bncc?label=PyPI%20bncc)](https://pypi.org/project/bncc/)
[![Código: MIT](https://img.shields.io/badge/c%C3%B3digo-MIT-green.svg)](LICENSE-CODIGO.md)
[![Dados: CC BY 4.0](https://img.shields.io/badge/dados-CC%20BY%204.0-lightgrey.svg)](LICENSE-DADOS.md)

A Base Nacional Comum Curricular (BNCC) consumível em uma linha de código. As
1.721 aprendizagens da educação básica brasileira, verificadas contra os
documentos oficiais do MEC/CNE, como pacote npm, pacote PyPI e servidor MCP para
agentes de IA. Dados embutidos, zero dependências de runtime, zero rede: a
consulta acontece na sua máquina.

O dataset não nasce aqui, vem do [bncc-dados](https://github.com/bncc-dev/bncc-dados).
Este repositório são as **interfaces para máquina** desse dataset.

## Uso rápido

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
buscar('frações', { etapa: 'EF', componente: 'MA' });             // 6 resultados
decodificar('EM13LGG103');  // { etapa: 'EM', area: 'LGG', competenciaEspecifica: 1, sequencia: 3, ... }
```

**Python**, a mesma semântica, na convenção de cada ecossistema:

```python
from bncc import por_codigo, habilidades_ef, buscar, decodificar

por_codigo('EF67LP08')['texto']
habilidades_ef(componente='LP', ano=6, pratica='Leitura')  # 37
decodificar('EI02TS01')  # {'etapa': 'EI', 'campo_experiencias': 'TS', ...}
```

Que as duas respondam idêntico não é promessa: é
[testado a cada commit](docs/paridade.md) pelas mesmas consultas douradas.

## Servidor MCP

Sete tools (`bncc_lookup`, `bncc_buscar`, `bncc_listar`, `bncc_decodificar`,
`bncc_estatisticas`, `bncc_estrutura`, `bncc_progressao_ei`) que dão ao agente a
BNCC verificada, com fonte oficial em cada resposta. Códigos inexistentes
recebem um erro que explica que a numeração da BNCC tem lacunas legítimas, em
vez de um `null` que convida à alucinação.

**Local**, sem instalação permanente:

```json
{ "mcpServers": { "bncc": { "command": "npx", "args": ["-y", "@bncc/mcp"] } } }
```

**Hospedado**, sem instalação nenhuma e sem API key: `https://mcp.bncc.dev`
(streamable HTTP).

Quanto isso muda a resposta de um modelo está medido, com dados brutos
publicados, no [bncc-benchmark](https://github.com/bncc-dev/bncc-benchmark).

## O que tem neste repositório

| Diretório | Publica | Versão |
|---|---|---|
| `packages/bncc` | npm [`@bncc/dados`](https://www.npmjs.com/package/@bncc/dados): dados embutidos + API tipada | `0.3.1` |
| `packages/mcp` | npm [`@bncc/mcp`](https://www.npmjs.com/package/@bncc/mcp): o servidor MCP, via npx | `0.2.0` |
| `python/` | PyPI [`bncc`](https://pypi.org/project/bncc/): a API equivalente em snake_case | `0.2.0` |
| `mcp-worker/` | o mesmo MCP hospedado em `mcp.bncc.dev` (Cloudflare Workers) | no ar |

Os dados embutidos são sincronizados de um commit específico do bncc-dados por
`scripts/sincronizar-dados.mjs`, com data-version e checksums registrados em
`dados/VERSAO.json` de cada pacote. Ninguém edita `dados/` à mão.

O `1.0.0` dos três pacotes está condicionado à release `dados-v1.0.0` do
bncc-dados, que traz a revisão pedagógica registrada.

O site (bncc.dev) e o worker do formulário de contato **não vivem aqui**:
migraram para [bncc-site](https://github.com/bncc-dev/bncc-site) em jul/2026.
Fica neste repo o que compartilha o dataset: ver [DECISOES.md](DECISOES.md) D2.

## Desenvolvimento

```bash
pnpm install && pnpm -r build && pnpm -r test   # npm, MCP e worker
cd python && uv sync && uv run pytest           # PyPI
```

Node 22+, [pnpm](https://pnpm.io) (a versão vem do `packageManager`) e
[uv](https://docs.astral.sh/uv/). O CI roda exatamente esses dois blocos.

Antes de abrir PR, leia o [CONTRIBUTING.md](CONTRIBUTING.md): a regra de ouro é
que o núcleo injetável (`criarConsultas`) é a **única** superfície de consulta, e
PRs que reimplementem lookup, busca ou decodificação são recusados mesmo
passando nos testes.

## Documentação

| Documento | Para quê |
|---|---|
| [docs/manual-rapido.md](docs/manual-rapido.md) | A visão de quem consome os pacotes: receitas por caso de uso |
| [docs/arquitetura.md](docs/arquitetura.md) | O desenho do monorepo, o fluxo de dados pinado e o núcleo injetável |
| [docs/paridade.md](docs/paridade.md) | O contrato das consultas douradas que impede npm e PyPI de divergirem |
| [docs/manutencao.md](docs/manutencao.md) | Runbook: atualizar dados, mudar API, publicar, troubleshooting |
| [DECISOES.md](DECISOES.md) | As escolhas não óbvias e por quê |
| [CHANGELOG.md](CHANGELOG.md) | O que mudou em cada versão publicada |
| [AGENTS.md](AGENTS.md) | Regras para agentes de IA trabalhando neste repo |

## O ecossistema

| Repositório | O que é |
|---|---|
| [bncc-dados](https://github.com/bncc-dev/bncc-dados) | O dataset: extração reprodutível, validada em CI, com proveniência por registro |
| **bncc-pacotes** | Este repo: npm, PyPI e MCP sobre o dataset |
| [bncc-benchmark](https://github.com/bncc-dev/bncc-benchmark) | Quanto os LLMs alucinam sobre a BNCC, e quanto o grounding resolve |

## Quem mantém

O bncc.dev é mantido pela [Profy](https://www.profy.ai/). A Profy opera produtos
que usam LLMs sobre a BNCC; estes pacotes são a camada verificada que esses
produtos consomem, publicada aberta para que qualquer um consuma a mesma coisa.

## Licenças

Código **MIT**, dados embutidos **CC BY 4.0**, em arquivos separados porque o
mesmo artefato publicado carrega as duas naturezas: [LICENSE](LICENSE),
[LICENSE-CODIGO.md](LICENSE-CODIGO.md), [LICENSE-DADOS.md](LICENSE-DADOS.md).

O nome "bncc.dev" e a identidade visual **não** são licenciados: o código é
livre, a marca não. Derivados não devem se apresentar como sendo o bncc.dev.

Segurança: [SECURITY.md](SECURITY.md) (não abra issue pública).
Conduta: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

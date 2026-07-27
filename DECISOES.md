# Decisões

Registro das escolhas que não são óbvias a partir do código, para que ninguém
precise arqueologia de commit para entender por quê. Mesmo formato do
[bncc-dados](https://github.com/bncc-dev/bncc-dados) e do
[bncc-benchmark](https://github.com/bncc-dev/bncc-benchmark).

## D1 · Monorepo para npm, PyPI e MCP

**Decisão:** os três pacotes ficam no mesmo repositório.

**Por quê:** três mecanismos dependem disso. (a) `scripts/sincronizar-dados.mjs`
atualiza os dados dos dois pacotes em um comando, com o mesmo commit e
checksums, tornando o drift de data-version estruturalmente impossível.
(b) `fixtures/consultas-douradas.json` é um arquivo só, executado pelo vitest e
pelo pytest: é a prova de paridade, e em repos separados viraria cópia
dessincronizada. (c) O workspace pnpm faz o MCP buildar contra o `@bncc/dados`
local, não contra uma versão publicada.

**Custo aceito:** tooling misto (pnpm + uv) e histórico compartilhado.

## D2 · O que sai do monorepo

**Decisão:** o que não compartilha o dataset não fica.

**Consequências:** o site saiu em jul/2026 para o
[bncc-site](https://github.com/bncc-dev/bncc-site); o `contato-worker` o seguiu
em jul/2026 (era o backend do formulário de contato, sem um único import daqui).
O `mcp-worker` ficou, apesar de também ser um Worker Cloudflare: ele importa
`@bncc/mcp/tools` e `@bncc/dados/nucleo` via `workspace:*` e precisa buildar
contra o código local.

## D3 · API em português, convenção de cada ecossistema

**Decisão:** `porCodigo()` no npm (camelCase), `por_codigo()` no PyPI
(snake_case). Mesma semântica, nomes na convenção de cada linguagem.

**Por quê:** o público é dev brasileiro e o dado é pt-BR. Traduzir a API para
inglês criaria uma camada de tradução mental sobre um vocabulário
(competência, habilidade, campo de experiências) que não tem equivalente
estável em inglês.

## D4 · Núcleo injetável como única superfície de consulta

**Decisão:** toda a lógica de consulta vive em `criarConsultas(dados)`
(`packages/bncc/src/nucleo.ts`), sem tocar em sistema de arquivos. As cascas
(fs, MCP stdio, MCP remoto) só injetam dados e delegam.

**Por quê:** permite rodar em runtimes sem fs (Cloudflare Workers) e, mais
importante, impede que o MCP responda diferente da lib com o mesmo dado. Virou
a regra de ouro do [CONTRIBUTING.md](CONTRIBUTING.md).

## D5 · Dados embutidos, zero rede, zero dependências

**Decisão:** os JSONs viajam dentro do pacote; nenhuma consulta faz I/O de rede.

**Por quê:** previsibilidade e offline. O custo é tarball maior (~2 MB) e a
necessidade de republicar a cada atualização de dado, aceito em troca de não ter
serviço no caminho de uma consulta. Quem quer dado sempre fresco usa a
api.bncc.dev.

## D6 · `pnpm publish`, nunca `npm publish`

**Decisão:** publicação sempre por pnpm.

**Por quê:** só o pnpm converte o `workspace:*` do MCP para a versão real.
Publicar com npm gerou pacote ininstalável no `@bncc/mcp@0.1.0`, depreciado em
09/07/2026. Está no CONTRIBUTING e no runbook.

## D7 · Licenças separadas para código e dados

**Decisão:** MIT para o código, CC BY 4.0 para os JSONs embutidos, em arquivos
distintos (`LICENSE-CODIGO.md` e `LICENSE-DADOS.md`), com o `LICENSE` explicando
a divisão. Nome e identidade visual ficam fora de ambas.

**Por quê:** o mesmo artefato publicado carrega as duas naturezas, e uma licença
única mentiria sobre uma delas. Modelo herdado do bncc-benchmark.

## D8 · `sincronizado_de` grava só o nome do diretório

**Decisão:** o `VERSAO.json` registra `"sincronizado_de": "bncc-dados"`, não o
caminho absoluto.

**Por quê:** o arquivo viaja dentro do tarball do npm e do wheel do PyPI. Até a
`@bncc/dados@0.3.1` e a `bncc 0.2.0`, ele publicou o caminho pessoal da máquina
de quem sincronizou. O que identifica a origem de forma reprodutível é o campo
`commit`, que continua lá. Achado da auditoria de abertura; ver
`docs/plano-abertura.md` (interno).

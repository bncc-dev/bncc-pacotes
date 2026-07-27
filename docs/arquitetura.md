# Arquitetura do bncc-pacotes

Como as interfaces para máquina do bncc.dev se organizam, e por que assim.

## O desenho em uma frase

Uma única fonte de dados (bncc-dados), embutida de forma pinada em dois pacotes irmãos (npm e PyPI) que provam equivalência por fixtures compartilhadas, e um servidor MCP que é casca fina sobre o pacote npm, servido em dois transportes: stdio local (`npx @bncc/mcp`) e remoto em Workers (mcp.bncc.dev).

```mermaid
flowchart LR
    DADOS[("bncc-dados<br/>JSONs verificados<br/>data-version")] -->|sincronizar-dados.mjs<br/>commit + checksums| NPM["@bncc/dados (npm)<br/>API pt-BR camelCase"]
    DADOS -->|mesma sincronização| PY["bncc (PyPI)<br/>API pt-BR snake_case"]
    NPM -->|importa, zero reimplementação| MCP["@bncc/mcp<br/>7 tools · stdio local"]
    MCP -->|@bncc/mcp/tools<br/>mesmas 7 tools| WORKER["mcp-worker<br/>Workers + Hono<br/>mcp.bncc.dev"]
    FIX["fixtures/consultas-douradas.json"] -.->|vitest| NPM
    FIX -.->|pytest| PY
    MCP --> AGENTES["Claude Code, Cursor..."]
    WORKER --> REMOTOS["Claude, ChatGPT...<br/>(colar URL, zero install)"]
    NPM -->|npm, getStaticPaths no build| SITE["bncc-site (repo próprio)<br/>Astro · páginas estáticas<br/>bncc.dev"]
    NPM -->|núcleo injetável<br/>@bncc/dados/nucleo| APIH["bncc-api (repo próprio)<br/>Workers + Hono<br/>api.bncc.dev"]
    NPM --> APPS["apps TypeScript"]
    PY --> CIENCIA["Python, pandas, notebooks"]
```

## Princípios (herdados do projeto, aplicados aqui)

1. **Dado nunca flutua.** Os JSONs embutidos vêm de um commit específico do bncc-dados, com data-version e checksums registrados em `dados/VERSAO.json` de cada pacote. O script `scripts/sincronizar-dados.mjs` recusa checkout sujo. Ninguém edita `dados/` à mão.
2. **Uma implementação de consulta por runtime, nunca duas no mesmo.** O MCP importa o `@bncc/dados`; handlers têm ~5 linhas. A duplicação inevitável (npm vs PyPI, runtimes diferentes) é vigiada pelo contrato de paridade (ver `docs/paridade.md`).
3. **Zero dependências de runtime no pacote de dados.** O `@bncc/dados` usa só Node stdlib; o `bncc` (PyPI) só stdlib Python (pandas é extra opcional). O MCP depende apenas do SDK oficial + zod.
4. **API em português.** Decisão de produto (público dev BR, dado em pt-BR): `porCodigo()` no npm, `por_codigo()` no PyPI. A mesma semântica, a convenção de cada ecossistema.
5. **Erros ensinam.** Código inexistente responde "a numeração da BNCC tem lacunas legítimas" em vez de null silencioso. Anti-alucinação é requisito, não detalhe.

## Por que um monorepo

Os projetos deste repo (pacote npm, pacote PyPI e servidor MCP nos dois transportes) não são produtos independentes: são interfaces do mesmo dado, e precisam dizer exatamente a mesma coisa a cada release. Três mecanismos dependem de estarem no mesmo repositório:

1. **Sincronização atômica do dataset.** O `scripts/sincronizar-dados.mjs` copia os JSONs do bncc-dados para `packages/bncc/dados` e `python/bncc/dados` em um único comando, registrando o mesmo commit, data-version e checksums no `VERSAO.json` de cada destino. Em repos separados, cada pacote sincronizaria por conta própria e nada impediria o npm de embutir uma data-version enquanto o PyPI embute outra. Aqui, o drift é estruturalmente impossível: ou os dois atualizam no mesmo commit, ou nenhum.

2. **Paridade por fixture única.** O `fixtures/consultas-douradas.json` é um arquivo só, executado pelo vitest (npm) e pelo pytest (PyPI). É a prova de que as duas libs respondem identicamente às mesmas consultas (ver `docs/paridade.md`). Essa fonte única de verdade só existe porque os dois runners vivem no mesmo repo; separados, a fixture viraria uma cópia que dessincroniza, e o risco número 1 da fase (divergência silenciosa entre pacotes) voltaria pela porta dos fundos.

3. **Cadeia de dependência validada por inteiro.** O workspace pnpm amarra a pilha: o `packages/mcp` e o `mcp-worker` consomem `@bncc/dados` via `workspace:*`, ou seja, sempre buildam contra a versão local, não uma publicada. Quando o dado ou a API muda, `pnpm -r build && pnpm -r test` valida tudo (lib, MCP local e MCP remoto) no mesmo commit, antes de qualquer publish. Em repos separados, uma mudança no `@bncc/dados` exigiria publicar no npm primeiro para só então o MCP conseguir buildar contra ela.

A linha de corte segue o princípio "separar reputações" do projeto: separa-se o que envelhece em ritmos diferentes. Por isso o bncc-dados (dados envelhecem em anos), o bncc-api (deploy próprio em Workers, ciclo operacional independente) e os futuros templates (envelhecem em meses) são repos próprios. Já npm, PyPI e MCP envelhecem juntos, no ritmo do dataset que embarcam, e lançam em lockstep: sincroniza uma vez, roda a suíte inteira, publica tudo do mesmo commit.

O corolário prático: **o que não compartilha o dataset não fica.** O site saiu em jul/2026 (`bncc-site`) e o `contato-worker` o seguiu em jul/2026: era o backend do formulário de contato, sem um único import deste repo, e foi para junto da página que o chama. Ficou o `mcp-worker`, que parece infra mas não é: ele importa `@bncc/mcp/tools` e `@bncc/dados/nucleo` via `workspace:*` e é validado pelo mesmo `pnpm -r test`.

Custo aceito em troca: tooling misto no mesmo repo (pnpm + uv) e histórico compartilhado entre os pacotes. Para interfaces finas sobre o mesmo dado, com um mantenedor, esse custo é bem menor que o risco de divergência entre elas.

## Os três pacotes

### `packages/bncc` → npm `@bncc/dados`

- TypeScript, build tsup (ESM + CJS + `.d.ts`), dados como arquivos JSON no tarball (204 KB).
- Camadas internas: `nucleo.ts` (núcleo injetável: `criarConsultas(dados)` com índices + toda a lógica de consulta, zero fs), `consultas.ts` (casca fs: carrega os JSONs embutidos e delega), `decodificar.ts` (port do `pipeline/codigos.py` do bncc-dados), `tipos.ts` (espelho manual dos JSON Schemas).
- Subpaths exportados desde a 0.2.0: `@bncc/dados/nucleo` e `@bncc/dados/dados/*.json`, para runtimes sem sistema de arquivos (Cloudflare Workers: é como o bncc-api consome o pacote).
- Superfície: `porCodigo`, `decodificar`, `habilidadesEF/EM`, `objetivosEI`, `buscar`, `progressaoEI`, `estrutura`, `estatisticas`, `versao`.

### `packages/mcp` → npm `@bncc/mcp`

- `@modelcontextprotocol/sdk` + `zod@^3` (linha suportada pelo SDK; não usar zod 4).
- 7 tools; 4 nomes convergem com o bncc-mcp pioneiro (dfdb76): `bncc_lookup`, `bncc_buscar`, `bncc_listar`, `bncc_estatisticas`; 3 são nossas: `bncc_decodificar`, `bncc_progressao_ei`, `bncc_estrutura`.
- As tools são runtime-agnósticas desde a 0.2.0: `registrarTools(servidor, bncc, versao)` recebe o objeto `Consultas` injetado. O stdio (`servidor.ts`) monta o objeto com a casca fs do `@bncc/dados`; o remoto monta via `criarConsultas` + JSONs importados. Export `@bncc/mcp/tools` existe para o worker consumir.
- Decisões de formato: respostas JSON estruturado; listagens sempre com `limite` (default) + `total` para não inundar o contexto do agente; `fonte` presente em todo registro completo; erros com `isError` e mensagem pedagógica; `instructions` do servidor carregam o resumo do domínio.
- Sem camada Mapa de Foco (licença CC BY-NC do Instituto Reúna).

### `mcp-worker/` → mcp.bncc.dev (MCP remoto)

- Cloudflare Workers + Hono + `@hono/mcp` (streamable HTTP sobre Request/Response web-standard). Stateless: servidor e transport novos por request; consultas em escopo de módulo via núcleo injetável, padrão idêntico ao da bncc-api.
- Sem cadastro e sem API key; rate limit 60 req/min por IP (namespace 1003) com 429 apontando o stdio local como alternativa sem limite.
- MCP em `POST /` e `POST /mcp` (URL canônica `/mcp`); `GET` de navegador recebe página humana de documentação. Detalhes e decisões: `mcp-worker/README.md`.

### `python/` → PyPI `bncc`

- Hatchling, wheel de 208 KB, `requires-python >= 3.10`.
- Camadas espelho: `_indice.py`, `_codigos.py` (cópia adaptada do pipeline do bncc-dados), `_consultas.py`, `_pandas.py` (extra opcional).
- Registros como dicts snake_case com a mesma semântica dos objetos do npm.

## Fluxo de versão

```
bncc-dados release dados-AAAA.MM
        │  node scripts/sincronizar-dados.mjs ~/caminho/bncc-dados
        ▼
dados/ atualizados nos dois pacotes (VERSAO.json registra commit+checksums)
        │  pnpm -r test && (cd python && uv run pytest)
        ▼
bump de versão dos pacotes (minor para dado novo) → publicação
```

Mapeamento de versões: a versão do pacote segue semver próprio; a data-version dos dados embutidos é sempre consultável em runtime via `versao()`. O README de cada release declara qual data-version embute.

## Gate de publicação

O marco `1.0.0` não sai antes da release `dados-v1.0.0` do bncc-dados (revisão pedagógica registrada). Pré-releases publicadas em 09/07/2026: npm `@bncc/dados@0.1.0` e `0.2.0` (núcleo injetável) e `@bncc/mcp@0.1.1` (o 0.1.0 do MCP foi depreciado: publicado com npm publish sem conversão do workspace); PyPI `bncc 0.1.0`.

### bncc.dev → repo próprio `bncc-site`

O site **saiu deste monorepo** em 20/jul/2026 para o repo próprio `github.com/bncc-dev/bncc-site` (Astro, páginas estáticas por aprendizagem/competência + navegação + busca + CSVs). Ele consome o `@bncc/dados` publicado no **npm** (não mais via workspace), sempre pela camada `src/lib/dados.ts`, com o pacote `ssr.external` no Vite. Deploy contínuo na mesma infra AWS (ECS `bncc-site` → bncc.dev). Detalhes da migração: `iaebb/docs/plans/extracao-site-repo-proprio.md`.

## O que fica fora deste repo

- Extração e validação dos dados: bncc-dados.
- Site bncc.dev: repo bncc-site (consome `@bncc/dados` do npm).
- API hospedada: repo bncc-api (Fase 4, em construção; consome `@bncc/dados/nucleo`).

# bncc-mcp · servidor MCP remoto (mcp.bncc.dev)

As 7 tools do `@bncc/mcp` via **streamable HTTP** em Cloudflare Workers: o usuário
cola `https://mcp.bncc.dev/mcp` no Claude, ChatGPT ou Cursor e consulta a BNCC
sem instalar nada, sem cadastro e sem API key. Complementa o stdio local
(`npx -y @bncc/mcp`), não o substitui.

É um Worker separado de propósito (mesmo racional do worker de contato, hoje
no repo `bncc-site`): a bncc-api permanece somente REST e cada superfície tem
reputação própria. Este fica aqui porque não é infra avulsa: importa
`@bncc/mcp/tools` e `@bncc/dados/nucleo` via `workspace:*` e é validado junto
dos pacotes.
Cloudflare-native: sobrevive à migração do dia D sem mudanças.

## Decisões

- **Zero reimplementação:** as tools vêm de `@bncc/mcp/tools` (workspace) e os
  dados do núcleo injetável (`@bncc/dados/nucleo` + JSONs importados como
  módulos), exatamente como a bncc-api.
- **Stateless:** `McpServer` e transport novos por request
  (`sessionIdGenerator: undefined`), sem sessão e sem Durable Objects; as tools
  são somente leitura e os dados são imutáveis por data-version.
  `enableJsonResponse: true`: resposta JSON pura em vez de SSE por POST.
- **MCP em `/` e `/mcp`:** a URL canônica documentada é `/mcp` (convenção do
  ecossistema), mas a raiz também atende para eliminar erro de quem cola a URL
  sem path. `GET` com `Accept: text/html` serve a página humana; `GET` de SSE
  standalone e `DELETE` recebem 405 pedagógico.
- **Rate limit 60 req/min por IP** (binding `ratelimit`, namespace 1003;
  1001 = api, 1002 = contato, este último no repo `bncc-site`; os números
  seguem reservados). O 429 aponta o MCP local como alternativa sem
  limite. Ausente em dev/testes; o código tolera.
- **CORS liberado** com `mcp-session-id` e `mcp-protocol-version` em
  allow/expose (clientes MCP de navegador precisam ler esses headers).
- **Browser Integrity Check da Cloudflare desligado para `mcp.bncc.dev`**
  (issue #13, 25/ago/2026). O BIC é um filtro anti-bot para páginas de
  navegador e barrava com 403 (`error code: 1010`) User-Agents de bibliotecas
  HTTP, como `Python-urllib`, antes de a requisição chegar ao worker. Este é
  um endpoint para máquinas; a proteção fica no rate limit acima. Se um
  cliente voltar a receber 403 em texto puro (sem o `{erro, dica}` do
  worker), confira essa configuração no painel da Cloudflare antes de
  procurar no código.

## Dev e testes

```sh
pnpm install && pnpm -r build   # o worker consome dist/tools.js do @bncc/mcp
pnpm test                       # vitest: handshake, tools via HTTP, CORS, 405s, rate limit
pnpm dev                        # wrangler dev (localhost:8787; sem o binding de rate limit)
pnpm verificar-bundle           # wrangler deploy --dry-run (~368 KB gzip)
```

Smokes:

```sh
# initialize
curl -s -X POST localhost:8787/mcp -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'
# Inspector interativo
npx @modelcontextprotocol/inspector   # conectar em http://localhost:8787/mcp (streamable HTTP)
# Inspector CLI contra produção
npx @modelcontextprotocol/inspector --cli https://mcp.bncc.dev/mcp --transport http --method tools/list
```

## Deploy

```sh
pnpm run deploy   # "run" obrigatório: "pnpm deploy" é comando reservado do pnpm
```

O custom domain `mcp.bncc.dev` é criado pelo próprio wrangler (zona bncc.dev
na conta). Histórico: primeiro deploy em 12/jul/2026, validado com Inspector,
Claude Code (`claude mcp add --transport http bncc https://mcp.bncc.dev/mcp`)
e curl. A divulgação segue o gate de lançamento; publicar `@bncc/mcp@0.2.0`
no npm continua gateado no dia D (o worker usa a versão do workspace).

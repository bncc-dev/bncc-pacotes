# bncc-contato · Worker do formulário de contato

Recebe o `POST` do formulário de `bncc.dev/contato/`, valida, filtra spam
(honeypot + rate limit + Turnstile) e entrega na caixa da equipe via
**Email Routing** da zona bncc.dev. Sem provedor externo e sem secret de e-mail.

É um Worker separado de propósito: a bncc-api permanece somente leitura.

## Setup (Etapa B · uma vez, no dashboard da Cloudflare)

1. **Email Routing** (zona bncc.dev → Email → Email Routing):
   - Habilitar (cria os registros MX; a zona não tem e-mail, sem conflito).
   - Verificar como *destination address* o e-mail da equipe que receberá as mensagens.
   - Criar o endereço `contato@bncc.dev` encaminhando para esse destino
     (é o e-mail público exibido na página e o fallback do formulário).
2. **Turnstile** (dashboard → Turnstile → Add site, domínio `bncc.dev`, modo Managed):
   - A **site key** (pública) vai em `TURNSTILE_SITE_KEY` na página `site/src/pages/contato.astro`.
   - A **secret key**: `pnpm exec wrangler secret put TURNSTILE_SECRET`.
3. Neste `wrangler.toml`, trocar os dois `PREENCHER-NA-ETAPA-B@example.com`
   (var `DESTINO` e o binding `send_email`) pelo destino verificado no passo 1.
4. Deploy: `pnpm exec wrangler deploy` (primeiro na URL workers.dev).
5. **Custom domain**: descomentar `routes` (contato.bncc.dev) e redeployar.
   Conferir que a página usa essa URL em `CONTATO_API`.

Nota para o dia D: MX, Worker e Turnstile já são Cloudflare-native e
**não mudam** com a migração do site/API para a arquitetura de lançamento.

## Dev e testes

```sh
pnpm install
pnpm test                       # vitest: validação, honeypot, MIME
cp .dev.vars.example .dev.vars  # secret de teste do Turnstile (sempre passa)
pnpm dev                        # wrangler dev em localhost:8787
```

Smokes locais (o envio real só funciona deployado, com o binding):

```sh
# válido (em dev falha só no envio, com 502 e dica de fallback)
curl -s localhost:8787 -X POST -H 'content-type: application/json' \
  -d '{"nome":"Maria","email":"maria@escola.br","mensagem":"olá"}'
# inválido → 400 {erro, dica}
curl -s localhost:8787 -X POST -H 'content-type: application/json' -d '{"nome":"Maria"}'
# honeypot → 200 {ok:true} falso-sucesso, mensagem descartada
curl -s localhost:8787 -X POST -H 'content-type: application/json' \
  -d '{"nome":"Bot","email":"bot@spam.io","mensagem":"spam","site":"http://spam.io"}'
```

## Contrato

`POST /` com JSON `{nome, email, mensagem, assunto?, token?, site?}`.
Respostas: `200 {ok:true}` · `4xx/5xx {erro, dica}` (dica sempre aponta o
fallback `contato@bncc.dev`). CORS restrito a `https://bncc.dev` e ao dev
local do Astro. Rate limit: 5 envios/min por IP (só no runtime Workers).

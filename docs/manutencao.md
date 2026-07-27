# Manutenção · runbook

Procedimentos operacionais do bncc-pacotes. Público: mantenedor técnico (e agentes de IA; ver também AGENTS.md).

## Atualizar os dados embutidos (nova data-version do bncc-dados)

1. Garanta checkout limpo e atualizado do bncc-dados (o script recusa estado sujo).
2. `node scripts/sincronizar-dados.mjs ~/caminho/para/bncc-dados`
3. `pnpm -r build && pnpm -r test` e `cd python && uv run pytest`
4. Se contagens mudaram (mudança normativa), as fixtures douradas vão quebrar: atualize os valores esperados COM a mudança documentada no changelog do bncc-dados como justificativa, nunca "para passar".
5. Bump de versão nos três `package.json`/`pyproject.toml` (minor para dado novo, patch para correção) + entrada no changelog de cada pacote.
6. Commit, push, CI verde, publicação (se após o gate).

## Mudar ou adicionar consulta na API

Regra de ouro: **npm e PyPI andam juntos, sempre.**

1. Implemente no `packages/bncc/src/consultas.ts` E no `python/bncc/_consultas.py` (mesma semântica, convenção de nome de cada ecossistema: `porCodigo` / `por_codigo`).
2. Adicione pelo menos 1 caso em `fixtures/consultas-douradas.json` cobrindo a consulta nova.
3. Se necessário, estenda os DOIS runners (`packages/bncc/test/consultas-douradas.test.ts` e `python/tests/test_douradas.py`) para a operação nova.
4. Os dois suites verdes = paridade mantida. Um verde e outro vermelho = divergência real; corrija o pacote, não a fixture.
5. Avalie se a consulta merece virar tool no MCP (nem toda merece: tools demais confundem o agente).

## Adicionar ou mudar tool do MCP

1. `packages/mcp/src/tools.ts`: schema zod + descrição escrita para o agente (o que faz, quando usar, exemplo, regra anti-alucinação). A descrição é produto; revise como copy.
2. Handler fino: consulta o `@bncc/dados`, nunca reimplementa.
3. Listagens novas: sempre `limite` com default + `total` na resposta.
4. Teste em `packages/mcp/test/tools.test.ts` (cliente real do SDK via InMemoryTransport) + rode `node scripts/e2e.mjs` (em packages/mcp) contra o binário.
5. Convergência de nomes: prefixo `bncc_`, pt-BR, snake_case.

## Manter o site (bncc.dev)

O site **não vive mais neste repo**. Migrou para `github.com/bncc-dev/bncc-site` (Astro, consumindo `@bncc/dados` do npm). Manutenção, build, CI e deploy do bncc.dev acontecem lá; ver o `README.md` e o `docs/deploy.md` daquele repo. Uma mudança que afete o site (nova consulta na API, novo dado) só chega ao bncc.dev quando o `bncc-site` atualizar o pin de `@bncc/dados` e rebuildar.

## Publicar (após o gate `dados-v1.0.0`)

- npm (requer 2FA interativo do mantenedor):
  `cd packages/bncc && pnpm build && pnpm publish --access public`
  `cd packages/mcp && pnpm build && pnpm publish --access public`
  **SEMPRE `pnpm publish`, nunca `npm publish`**: só o pnpm converte o `workspace:*` do MCP para a versão real. Publicar com npm gera pacote ininstalável (aconteceu com o 0.1.0 do MCP, depreciado em 09/07/2026).
- PyPI (requer token `UV_PUBLISH_TOKEN`):
  `cd python && uv build && uv publish`
- Ordem: `@bncc/dados` primeiro, depois `@bncc/mcp`, depois PyPI.
- Depois de publicar: smoke real `npx -y @bncc/mcp` num cliente MCP e `pip install bncc` num venv limpo.

## CI (`.github/workflows/ci.yml`)

| Job | O que roda | Pegadinhas conhecidas |
|---|---|---|
| `testar` | pnpm install + build + test (recursivo) | Versão do pnpm vem SÓ do `packageManager` do package.json raiz (declarar também na action quebra com "multiple versions") |
| `python` | uv sync + pytest em `python/` | uv resolve o ambiente do zero; pandas entra pelo grupo dev |

(O job `site` foi removido junto com a migração do site: build, CI e deploy do bncc.dev vivem no `bncc-site`.)

## Dependências: política

- Runtime: zero no `@bncc/dados` e no `bncc` (PyPI). MCP: só SDK oficial + zod.
- `zod` fica na linha `^3` enquanto o SDK do MCP não suportar a 4 (verificar release notes do SDK antes de subir).
- Dev: tsup/vitest/typescript (node), pytest/pandas (python). Renovações em lote, com CI verde como critério.

## Troubleshooting

- **`ERR_PNPM_BAD_PM_VERSION` no CI**: conflito entre `packageManager` e versão na action; remova a da action.
- **Import ESM falha em script solto**: scripts que importam dependências precisam morar dentro do pacote que as declara (resolução ESM sobe a partir do arquivo). Ex.: `packages/mcp/scripts/e2e.mjs`.
- **`sincronizar-dados` recusa rodar**: o checkout do bncc-dados tem mudanças não commitadas; commite ou stash lá primeiro.
- **Fixture quebrou depois de sincronizar dados**: veja o changelog do bncc-dados; se a mudança é legítima (normativa/correção), atualize o valor esperado citando-a; se não há mudança documentada, o problema é real.

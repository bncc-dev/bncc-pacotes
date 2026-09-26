# Manutenção · runbook

Procedimentos operacionais do bncc-pacotes. Público: mantenedor técnico (e agentes de IA; ver também AGENTS.md).

## Atualizar os dados embutidos (nova data-version do bncc-dados)

1. Garanta checkout limpo e atualizado do bncc-dados (o script recusa estado sujo).
2. `node scripts/sincronizar-dados.mjs ~/caminho/para/bncc-dados`
3. `pnpm -r build && pnpm -r test` e `cd python && uv run pytest`
4. Se contagens mudaram (mudança normativa), as fixtures douradas vão quebrar: atualize os valores esperados COM a mudança documentada no changelog do bncc-dados como justificativa, nunca "para passar".
5. Bump de versão nos três `package.json`/`pyproject.toml` (minor para dado novo, patch para correção) + entrada no changelog de cada pacote.
6. Commit, push, CI verde e publicação, seguindo a seção "Publicar".

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

## Publicar

Só o mantenedor publica: npm pede 2FA no navegador e PyPI pede token. Versões `0.x` podem sair antes da release `dados-v1.0.0` do bncc-dados, por decisão do mantenedor; o gate vale para o marco `1.0.0` (DECISOES.md D9).

Publicar nos registries não atualiza o servidor MCP remoto: o `mcp.bncc.dev` é compilado deste repo e tem deploy próprio (passo 3). Versões `0.x` também não chegam sozinhas a quem fixa `^0.y.z`: em semver 0.x, o `^` não aceita uma minor nova.

1. **Antes do merge**, no PR da versão:
   - bump em `packages/bncc/package.json`, `packages/mcp/package.json` e `python/pyproject.toml` (o `uv sync` regrava o `python/uv.lock`);
   - CHANGELOG com a entrada da versão em cada pacote que muda, com a data marcada como `a publicar`;
   - se a semântica de uma consulta mudou, procure nos READMEs, em `docs/` e em `mcp-worker/src` textos que ainda descrevem o comportamento antigo.
2. **Registries**, na `main` atualizada, nesta ordem:
   ```bash
   pnpm install && pnpm -r build
   cd packages/bncc && pnpm publish --access public --no-git-checks
   cd ../mcp       && pnpm publish --access public --no-git-checks
   cd ../../python && rm -rf dist && uv build && uv publish --token '<token PyPI>'
   ```
   - **SEMPRE `pnpm publish`, nunca `npm publish`**: só o pnpm converte o `workspace:*` do MCP para a versão real. Publicar com npm gera pacote ininstalável (aconteceu com o 0.1.0 do MCP, depreciado em 09/07/2026).
   - `--no-git-checks` evita `ERR_PNPM_GIT_UNCLEAN` por arquivos não rastreados; o tarball sai de `dist/` e `dados/`.
   - **`rm -rf dist` antes do `uv build`**: o `uv publish` envia tudo o que estiver em `python/dist/`, inclusive artefatos de versões anteriores.
   - Se `npm whoami` der 401, rode `npm login`; o 2FA abre no navegador. O índice do PyPI leva cerca de 20 s para servir a versão nova.
   - Smoke real: `npx -y @bncc/mcp@X.Y.Z` num cliente MCP e `pip install bncc==X.Y.Z` num venv limpo, repetindo uma consulta que exercite a mudança da versão. Confira também `npm view @bncc/mcp@X.Y.Z dependencies`, que deve apontar para o `@bncc/dados` novo.
3. **Deploy do `mcp.bncc.dev`**, obrigatório quando os pacotes mudam. O `mcp-worker` consome `@bncc/dados` e `@bncc/mcp` por `workspace:*`, então vai ao ar o código deste repo, não o do npm:
   ```bash
   # bump de mcp-worker/package.json (a versão aparece em serverInfo e na página de docs)
   pnpm -r build && pnpm --filter bncc-mcp-worker test
   cd mcp-worker && pnpm verificar-bundle && pnpm run deploy   # "run" é obrigatório
   npx @modelcontextprotocol/inspector --cli https://mcp.bncc.dev/mcp --transport http --method tools/list
   ```
   Confira `serverInfo.version`, o header `X-BNCC-Data-Version` e uma chamada à tool afetada. 403 em texto puro é o Browser Integrity Check da Cloudflare (issue #13), não o código. Registre no CHANGELOG, na entrada do `@bncc/mcp`: "No ar em `mcp.bncc.dev` desde o `mcp-worker` X.Y.Z (data)".
4. **Registrar a publicação** num commit `docs: registra a publicação de ...` (modelo: `be24dc2`): troque `a publicar` pela data no CHANGELOG, registre na mensagem as verificações feitas e os números observados, e feche as issues apontando o PR e as versões.

## Onde o servidor MCP está registrado

O `@bncc/mcp` está listado no [Smithery](https://smithery.ai/servers/bncc-dev/bncc-mcp), que indexa pelo par organização/repositório (`bncc-dev/bncc-mcp`), não pelo nome do pacote npm. Vale saber ao procurar a listagem: URLs no formato `@bncc/mcp` não resolvem.

O que fazer quando sair versão nova:

- **npm e PyPI**: os registries leem a versão publicada sozinhos. Nada a fazer.
- **Smithery**: confira se a listagem pegou a versão nova e se a descrição continua correta. A descrição vem do pacote, então corrigi-la significa publicar versão nova, não editar no site.

Registries ainda não usados, se quiser ampliar alcance: mcp.so, Glama, LobeHub e a lista `awesome-mcp-servers` no GitHub. Todos pedem o mesmo conjunto de metadados (nome, descrição de uma frase, contagem de tools, tipo de transporte, URL do repositório e do site), então prepare uma vez e reaproveite.

O dataset que alimenta os pacotes tem arquivamento próprio, com DOI: veja `docs/versionamento.md` no bncc-dados.

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

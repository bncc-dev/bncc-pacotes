# AGENTS.md · guia para agentes de IA neste repositório

Monorepo das interfaces para máquina do bncc.dev: pacote npm `@bncc/dados`, servidor MCP `@bncc/mcp` (stdio local e remoto em `mcp-worker/` → mcp.bncc.dev) e pacote PyPI `bncc`. Leia `docs/arquitetura.md` para o desenho, `docs/manutencao.md` para procedimentos e `docs/manual-rapido.md` para a visão de consumidor dos pacotes.

## Regras que nunca se quebram

1. **Nunca edite `packages/bncc/dados/` ou `python/bncc/dados/` à mão.** São sincronizados de um commit pinado do bncc-dados por `scripts/sincronizar-dados.mjs`. Dado errado se corrige lá, nunca aqui.
2. **API muda nos dois pacotes ou em nenhum.** Toda alteração de consulta acontece em `packages/bncc/src/consultas.ts` E `python/bncc/_consultas.py`, com caso novo em `fixtures/consultas-douradas.json`. Um pacote na frente do outro = paridade quebrada = CI vermelho.
3. **A fixture dourada não se ajusta "para passar".** Ela só muda com mudança documentada de dado ou de API (ver `docs/paridade.md`).
4. **O MCP não reimplementa consultas.** As tools (`packages/mcp/src/tools.ts`) recebem o objeto `Consultas` injetado; se uma tool precisa de lógica nova, a lógica vai para o pacote (nos dois!) e a tool a consome. O worker remoto (`mcp-worker/`) também não reimplementa nada: consome `registrarTools` de `@bncc/mcp/tools` e os dados do núcleo injetável.
5. **Nunca publique nos registries por conta própria.** Publicação exige credenciais interativas do mantenedor humano (2FA), e sempre com `pnpm publish`, nunca `npm publish`: só o pnpm converte o `workspace:*`, e publicar com npm gera pacote ininstalável (foi o que matou a `@bncc/mcp@0.1.0`). O gate da release `dados-v1.0.0` do bncc-dados vale para o marco `1.0.0` dos pacotes; pré-releases `0.x` podem sair antes, por decisão do mantenedor (ver `DECISOES.md` D9).
6. **Zero dependências de runtime** nos pacotes de dados; MCP só SDK + zod v3 (não subir para zod 4 sem o SDK suportar).
7. **O site não vive mais aqui.** Migrou para o repo próprio `github.com/bncc-dev/bncc-site` (consome `@bncc/dados` do npm). Mudanças no bncc.dev vão lá, não neste repo.

## Convenções

- API em português: `porCodigo()` (TS, camelCase) / `por_codigo()` (Python, snake_case). Mesma semântica sempre.
- Tools MCP: prefixo `bncc_`, snake_case, descrições em pt-BR escritas para o agente (com regra anti-alucinação). Descrição de tool é produto: revise como copy.
- Erros ensinam: mensagens explicam ("a numeração da BNCC tem lacunas legítimas"), nunca retornam null silencioso.
- Documentos públicos sem travessão (—); use vírgula, dois-pontos ou parênteses.

## Comandos

```bash
pnpm install && pnpm -r build && pnpm -r test   # node (npm + MCP)
cd python && uv sync && uv run pytest           # python
node scripts/sincronizar-dados.mjs ~/Dev/bncc-dados   # atualizar dados (checkout limpo!)
cd packages/mcp && node scripts/e2e.mjs         # e2e do MCP contra o binário real
pnpm --filter bncc-mcp-worker test              # worker MCP remoto (mcp.bncc.dev)
```
(O site migrou para `github.com/bncc-dev/bncc-site`; build e CI dele vivem lá.)

## Mapa do domínio em 30 segundos

BNCC = 1.580 aprendizagens em três taxonomias: EI (objetivos por campo de experiências e grupo etário, com alinhamento entre faixas), EF (habilidades por componente e ano, com unidades temáticas ou campos+práticas para LP ou eixos para LI), EM (habilidades por área, sem seriação, com competências vinculadas). Códigos decodificáveis: `EI02TS01`, `EF67LP08`, `EM13LGG103`. Nunca invente códigos: se não está nos dados, não existe.

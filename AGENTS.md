# AGENTS.md · guia para agentes de IA neste repositório

Monorepo das interfaces para máquina do bncc.dev: pacote npm `@bncc/dados`, servidor MCP `@bncc/mcp` e pacote PyPI `bncc`. Leia `docs/arquitetura.md` para o desenho, `docs/manutencao.md` para procedimentos e `docs/manual-rapido.md` para a visão de consumidor dos pacotes.

## Regras que nunca se quebram

1. **Nunca edite `packages/bncc/dados/` ou `python/bncc/dados/` à mão.** São sincronizados de um commit pinado do bncc-dados por `scripts/sincronizar-dados.mjs`. Dado errado se corrige lá, nunca aqui.
2. **API muda nos dois pacotes ou em nenhum.** Toda alteração de consulta acontece em `packages/bncc/src/consultas.ts` E `python/bncc/_consultas.py`, com caso novo em `fixtures/consultas-douradas.json`. Um pacote na frente do outro = paridade quebrada = CI vermelho.
3. **A fixture dourada não se ajusta "para passar".** Ela só muda com mudança documentada de dado ou de API (ver `docs/paridade.md`).
4. **O MCP não reimplementa consultas.** Handlers importam o `@bncc/dados`; se uma tool precisa de lógica nova, a lógica vai para o pacote (nos dois!) e a tool a consome.
5. **Nada de publicar nos registries.** Publicação é gateada (release `dados-v1.0.0` do bncc-dados) e exige credenciais interativas do mantenedor humano.
6. **Zero dependências de runtime** nos pacotes de dados; MCP só SDK + zod v3 (não subir para zod 4 sem o SDK suportar).
7. **No site (`site/`)**: todo dado passa por `src/lib/dados.ts` (nunca JSON cru nas páginas); copy pública sem travessão; JS além do inline do Base.astro precisa de justificativa; relações não-oficiais (ex.: progressão entre anos) sempre rotuladas como aproximação. Ver `site/README.md`.

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
pnpm --filter site build && node site/scripts/verificar-links.mjs   # site (1.787 páginas + links)
```

## Mapa do domínio em 30 segundos

BNCC = 1.580 aprendizagens em três taxonomias: EI (objetivos por campo de experiências e grupo etário, com alinhamento entre faixas), EF (habilidades por componente e ano, com unidades temáticas ou campos+práticas para LP ou eixos para LI), EM (habilidades por área, sem seriação, com competências vinculadas). Códigos decodificáveis: `EI02TS01`, `EF67LP08`, `EM13LGG103`. Nunca invente códigos: se não está nos dados, não existe.

# site/ · bncc.dev

O site de páginas canônicas da BNCC: 1.679 páginas estáticas geradas pelo Astro a partir do pacote `@bncc/dados` (workspace). Uma URL permanente por aprendizagem, mais navegação por etapa, componente, ano, área e campo de experiências.

## Rodar

```bash
pnpm --filter site dev     # desenvolvimento com recarga (localhost:4321)
pnpm --filter site build   # gera dist/ (1.679 páginas em ~2s)
node scripts/verificar-links.mjs   # contagem mínima + links internos (roda no CI)
python3 -m http.server 4173 --directory dist   # servir o build pronto
```

## URLs

- `/habilidade/{CODIGO}/` para EF e EM (1.487 páginas) e `/objetivo/{CODIGO}/` para EI (93).
- Navegação: `/fundamental/{componente}/{ano}/`, `/medio/{area}/`, `/infantil/{campo}/`.
- `/llms.txt` (índice para agentes), `sitemap-index.xml` (gerado).

## Design

O design system vem dos mocks aprovados do repositório de planejamento (`iaebb/docs/mockups/habilidade-ef67lp08.html` e `landing-futura.html`): visual GitHub-ish, accent verde, denso e funcional. Temas claro/escuro: padrão segue o sistema; o botão do topbar grava a escolha em `localStorage` (aplicada antes do primeiro paint).

A página de aprendizagem traz: decodificador interativo do código, seções de relacionadas (mesmo objeto de conhecimento; mesma prática/unidade em outros anos, rotulada como aproximação estrutural; mesma competência no EM; progressão entre faixas na EI), tabs "Para máquinas" (JSON real + npm + Python + MCP), e sidebar com proveniência (planilha + página do PDF), licença, reportar erro e citar.

## Regras deste diretório

1. **Todo dado vem de `src/lib/dados.ts`**, que é a única porta para o `@bncc/dados`. Páginas não leem JSON cru nem inventam conteúdo.
2. **Copy pública sem travessão** (convenção do projeto): vírgula, dois-pontos, parênteses; `·` como separador de marca.
3. **JavaScript mínimo**: só o inline do `Base.astro` (~1 KB: tema, ir-para-código, decoder, tabs, copiar). Interatividade nova precisa de justificativa; busca textual completa é da Fase 4.
4. O `@bncc/dados` fica `ssr.external` no Vite (`astro.config.mjs`): ele resolve os JSONs relativos ao próprio módulo e não pode ser empacotado.
5. Honestidade editorial: seções que sugerem relações não-oficiais (progressão entre anos) declaram isso no subtítulo.

## Deploy

Nesta fase, só build no CI. Deploy público (Cloudflare Pages + DNS bncc.dev) acontece na release `dados-v1.0.0`; extração para repositório próprio quando o pacote npm for publicado.

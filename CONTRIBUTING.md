# Guia de contribuição

Obrigado pelo interesse. Este repositório produz as três interfaces para máquina
do bncc.dev: o pacote npm `@bncc/dados`, o servidor MCP `@bncc/mcp` e o pacote
PyPI `bncc`. São cascas finas sobre o mesmo dataset, e a maior parte das regras
abaixo existe para impedir que elas divirjam.

## A regra de ouro: uma implementação de consulta por runtime

**O núcleo injetável é a única superfície de consulta.** Em TypeScript, toda
lógica de lookup, busca, decodificação de código e progressão vive em
`packages/bncc/src/nucleo.ts`, exposta por `criarConsultas(dados)`. Quem
consome recebe o objeto `Consultas` injetado e delega:

- `packages/mcp` (as 7 tools) recebe `Consultas` via `registrarTools()`;
- `mcp-worker/` monta o objeto com JSONs importados e usa as mesmas tools;
- a casca de sistema de arquivos (`consultas.ts`) só carrega os JSONs e delega.

**PRs que reimplementem lookup, busca ou decodificação em vez de consumir o
núcleo serão recusados**, mesmo que passem nos testes. Uma segunda
implementação no mesmo runtime é uma divergência esperando para acontecer: é
assim que uma tool do MCP passa a responder diferente da lib, com o mesmo dado.
Se falta lógica, ela entra no núcleo e todos os consumidores ganham junto.

A duplicação entre TypeScript e Python é inevitável (runtimes diferentes) e por
isso é vigiada pelo contrato de paridade, abaixo.

## As regras que decorrem dela

1. **Nunca edite `packages/bncc/dados/` ou `python/bncc/dados/` à mão.** São
   sincronizados de um commit pinado do bncc-dados por
   `scripts/sincronizar-dados.mjs`. **Dado errado se corrige em
   [bncc-dados](https://github.com/bncc-dev/bncc-dados)**, com fonte oficial,
   e chega aqui via nova sincronização.
2. **API muda nos dois pacotes ou em nenhum.** Toda alteração de consulta
   acontece em `packages/bncc/src/` **e** em `python/bncc/_consultas.py`, com
   caso novo em `fixtures/consultas-douradas.json`. Um pacote na frente do
   outro é paridade quebrada, e o CI reprova.
3. **A fixture dourada não se ajusta "para passar".** Ela só muda com mudança
   documentada de dado ou de API. Ver [docs/paridade.md](docs/paridade.md).
4. **Zero dependências de runtime** nos pacotes de dados. O MCP depende só do
   SDK oficial e de `zod@^3` (não subir para zod 4 enquanto o SDK não suportar).
   Dependência nova precisa de justificativa no PR.
5. **Nunca invente códigos ou textos de habilidade.** Se um código não está no
   dataset, ele não existe na BNCC: a numeração tem lacunas legítimas.

## Rodando localmente

```bash
pnpm install && pnpm -r build && pnpm -r test   # npm, MCP e worker
cd python && uv sync && uv run pytest           # PyPI
```

Requisitos: Node 22+, pnpm (a versão vem do `packageManager` do `package.json`
raiz) e [uv](https://docs.astral.sh/uv/) para o Python. O CI roda exatamente
esses dois blocos.

Para atualizar os dados embutidos é preciso um checkout limpo do bncc-dados ao
lado: `node scripts/sincronizar-dados.mjs ../bncc-dados`. O script recusa
checkout sujo de propósito.

## O que não aceitamos

- Segunda implementação de consulta (a regra de ouro).
- Mudança em `dados/` sem mudança correspondente no bncc-dados.
- Ajuste na fixture dourada para fazer um teste passar.
- Alteração de API em um só dos pacotes.
- Conteúdo gerado por LLM apresentado como texto oficial da BNCC.
- Material de terceiros com licença incompatível (ex.: derivados CC BY-NC).

## Antes de publicar (mantenedores)

Publicação é gateada pela release `dados-v1.0.0` do bncc-dados e exige
credenciais do mantenedor. Duas checagens que não podem ser puladas:

- **`pnpm publish`, nunca `npm publish`**: só o pnpm converte o `workspace:*`
  do MCP para a versão real. Publicar com npm gera pacote ininstalável (já
  aconteceu com o `@bncc/mcp@0.1.0`, depreciado em 09/07/2026).
- **`npm pack --dry-run` antes de cada publish**: o tarball é uma superfície
  pública própria. Confira que não entrou fixture interna, script de release nem
  caminho local.

## Conduta

Respeito e boa-fé. Este projeto serve a educação pública brasileira; discussões
técnicas com esse espírito. Regras completas e canal de denúncia no
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Segurança

Problemas de segurança não vão para issue pública: veja [SECURITY.md](SECURITY.md).

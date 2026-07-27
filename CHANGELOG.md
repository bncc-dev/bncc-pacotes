# Changelog

Formato: uma seção por versão publicada de cada pacote. Os três pacotes deste
monorepo têm ciclos próprios de versão, mas lançam em lockstep quando o dado
muda (ver [DECISOES.md](DECISOES.md) D1).

O `1.0.0` dos três está condicionado à release `dados-v1.0.0` do
[bncc-dados](https://github.com/bncc-dev/bncc-dados), que traz a revisão
pedagógica registrada.

## Não publicado

- Abertura do repositório: licenças separadas para código e dados, arquivos de
  comunidade (CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, DECISOES) e correção do
  `sincronizado_de`, que gravava caminho local no `VERSAO.json` embutido nos
  pacotes.

## `@bncc/dados`

### 0.3.1 — jul/2026
- Complemento de Computação incluído (1.721 aprendizagens no total).

### 0.2.0 — jul/2026
- Subpaths `@bncc/dados/nucleo` e `@bncc/dados/dados/*.json`, para runtimes sem
  sistema de arquivos (Cloudflare Workers).

### 0.1.0 — 09/jul/2026
- Pré-release: dados embutidos e API de consulta tipada em português.

## `@bncc/mcp`

### 0.2.0 — 27/jul/2026
- **Tools runtime-agnósticas.** `registrarTools(servidor, bncc, versao)` recebe
  o objeto `Consultas` injetado, em vez de carregar os dados por conta própria.
  O transporte stdio (`servidor.ts`) monta o objeto com a casca de sistema de
  arquivos do `@bncc/dados`; o MCP remoto monta via `criarConsultas` com os JSONs
  importados. Nenhuma consulta é reimplementada (ver `DECISOES.md` D4).
- **Novo export `./tools`**, para que o Worker remoto e outros consumidores
  reusem as 7 tools sem o transporte stdio.
- Publicada antes do gate `dados-v1.0.0`, por decisão registrada em
  `DECISOES.md` D9.

### 0.1.1 — 09/jul/2026
- Pré-release publicada por `pnpm publish`, corrigindo o `0.1.0`.

### 0.1.0 — 09/jul/2026 (depreciado)
- Publicado por engano com `npm publish`, que não converte o `workspace:*` da
  dependência: o pacote saiu ininstalável. Origem da regra D6.

## `bncc` (PyPI)

### 0.2.0 — jul/2026
- Complemento de Computação; paridade com o npm mantida pelas mesmas fixtures.

### 0.1.0 — 09/jul/2026
- Pré-release: API equivalente em snake_case.

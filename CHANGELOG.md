# Changelog

Formato: uma seção por versão publicada de cada pacote. Os três pacotes deste
monorepo têm ciclos próprios de versão, mas lançam em lockstep quando o dado
muda (ver [DECISOES.md](DECISOES.md) D1).

O `1.0.0` dos três está condicionado à release `dados-v1.0.0` do
[bncc-dados](https://github.com/bncc-dev/bncc-dados), que traz a revisão
pedagógica registrada.

## Não publicado

- `@bncc/mcp@0.2.0`: tools runtime-agnósticas (`registrarTools(servidor, bncc,
  versao)` recebe o objeto `Consultas` injetado) e export `./tools`, que permite
  ao MCP remoto e a outros consumidores reusarem as tools sem o transporte
  stdio. **Ainda não está no npm** (o publicado é o `0.1.1`).
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

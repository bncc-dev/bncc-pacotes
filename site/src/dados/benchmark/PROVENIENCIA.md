# Proveniência · leaderboard do benchmark de alucinação

- **Arquivo**: `leaderboard-v0.1.0.json`
- **Origem**: repositório `bncc-dev/bncc-benchmark` (privado até a release
  `dados-v1.0.0`), gerado por `harness/exportar-site.ts` a partir da rodada
  `oficial-seca-2026-07` (tag `v0.1.0`, 16/jul/2026).
- **Conteúdo**: métricas por modelo (17 modelos, 15.300 respostas julgadas),
  nota composta, exemplos curados e amostras de respostas cruas. Derivado de
  `julgados.jsonl` + `brutos-*.jsonl`; nada do held-out privado passa por aqui.
- **SHA-256**: `ab9e8e819868b07424d115f29832cbd0043bf1e6c90665f8460138adfa3c290e`
- **Atualização**: cada release do benchmark (semver, DECISOES.md D11 do repo
  de origem) gera um novo arquivo versionado; nunca sobrescrever este.

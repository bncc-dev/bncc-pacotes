# Proveniência · leaderboard do benchmark de alucinação

- **Arquivo**: `leaderboard-v0.1.0.json`
- **Origem**: repositório `bncc-dev/bncc-benchmark` (privado até a release
  `dados-v1.0.0`), gerado por `harness/exportar-site.ts` a partir da rodada
  `oficial-seca-2026-07` (tag `v0.1.0`, 16/jul/2026).
- **Conteúdo**: métricas por modelo (17 modelos, 15.300 respostas julgadas),
  nota composta, exemplos curados, amostras de respostas cruas e `amostras_drawer`
  (até 10 respostas reais por modelo, para o drawer de JSON bruto do site).
  Derivado de `julgados.jsonl` + `brutos-*.jsonl`; nada do held-out privado passa por aqui.
- **SHA-256**: `907dddc6427065b8af40d2da75b928543247391973b53b1fd19de6687145e85c`
- **Atualização**: cada release do benchmark (semver, DECISOES.md D11 do repo
  de origem) gera um novo arquivo versionado; nunca sobrescrever este.

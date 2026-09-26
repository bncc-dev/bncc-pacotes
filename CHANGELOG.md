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

### 0.5.0 — a publicar
- `buscar`: ranking determinístico (issue #14, DECISOES.md D10). Consulta e
  enunciado são reduzidos a radicais (plural, gênero e sufixos frequentes do
  português) sem palavras vazias; a pontuação é BM25 (k1 1,2; b 0,75) sobre o
  enunciado mais os campos estruturais (componente, unidade temática ou
  prática, objeto de conhecimento; peso 0,5). Três estratos: trecho literal com
  todos os radicais, todos os radicais, e parte deles só quando os dois
  primeiros estão vazios. Empate desfeito por código. `fração`, `frações` e
  `fracionário` passam a devolver o mesmo conjunto (22) e o mesmo topo; `de`
  sozinho devolve vazio; `texto` deixa de casar `contexto`. Cada item traz
  `pontuacao` (campo novo em `AprendizagemResolvida`). Exports novos:
  `radical`, `tokenizar`, `STOPWORDS`. Minor por mudar a semântica e a forma
  do resultado.
- Fixture dourada: operação `primeiros_buscar` (ordem dos N primeiros) com
  cinco casos; cinco casos novos de `contar_buscar`; três casos existentes
  revisados com o valor novo anotado (`C6-busca-fracoes` e `busca-sem-acento`
  6 → 22, `busca-co-tema` 13 → 14). Dados inalterados (`dados-2026.07.1`).

### 0.4.0 — 25/ago/2026
- `buscar`: consulta por palavras (issue #9). Pontuação passa a ser ignorada e,
  quando o trecho contíguo não casa, a busca devolve as aprendizagens que
  contêm todas as palavras da consulta, em qualquer ordem (determinístico, sem
  ranking). "ritmos velocidades fluxos" e "velocidades ritmos" agora acham
  EI01ET06; consultas de uma palavra e os casos dourados anteriores não mudam.
  `normalizarTexto` (export público) segue igual. Minor por mudar a semântica.
- `buscar`: o filtro `componente: "CO"` devolvia sempre zero, porque os
  registros de Computação não trazem o campo `componente` (issue #8). Agora
  restringe às habilidades EF de Computação, mesma regra de `habilidadesEF`.
- Seis casos novos na fixture dourada. Dados inalterados (`dados-2026.07.1`).

### 0.3.2 — ago/2026
- Dados atualizados para `dados-2026.07.1`: 11 textos corrigidos contra o PDF
  homologado, a partir de auditoria independente de 10/08/2026 (EF03LP20,
  EF69LP46, EF69LP34, EF02MA06, EF03MA05, EM13LP35, EF89LP19, EF69AR16,
  EF03LP11, EF04LP01, EF69LP48). Nenhuma mudança de API ou de contagens.
  Detalhes: changelog e decisão 12 do bncc-dados.
- `VERSAO.json` agora registra a tag exata do commit sincronizado como
  `data_version` (cobre patches em que a vigência dos registros não muda).

### 0.3.1 — jul/2026
- Complemento de Computação incluído (1.721 aprendizagens no total).

### 0.2.0 — jul/2026
- Subpaths `@bncc/dados/nucleo` e `@bncc/dados/dados/*.json`, para runtimes sem
  sistema de arquivos (Cloudflare Workers).

### 0.1.0 — 09/jul/2026
- Pré-release: dados embutidos e API de consulta tipada em português.

## `@bncc/mcp`

### 0.4.0 — a publicar
- Reempacota com `@bncc/dados` 0.5.0: `bncc_buscar` devolve os resultados por
  relevância e cada um traz `pontuacao` (issue #14). A descrição da tool diz
  como ordena, que plural, gênero e palavras vazias não importam, e que o
  casamento parcial só entra quando nenhum enunciado tem todas as palavras.

### 0.3.0 — 25/ago/2026
- Reempacota com `@bncc/dados` 0.4.0: `bncc_buscar` aceita consulta por
  palavras e o filtro `componente="CO"` funciona (issues #8 e #9). Descrição
  da tool explica as duas passadas da busca e orienta a enviar o enunciado
  completo para localizar um código. No ar em `mcp.bncc.dev` desde o
  `mcp-worker` 0.2.2 (25/ago/2026).

### 0.2.1 — ago/2026
- Reempacota com `@bncc/dados` 0.3.2 (dados `dados-2026.07.1`, 11 textos
  corrigidos). Sem mudança de tools.

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

### 0.4.0 — a publicar
- `buscar`: ranking determinístico com radical, stopwords e BM25, campo
  `pontuacao` em cada resultado (issue #14); paridade com o npm 0.5.0
  conferida pelas mesmas fixtures, inclusive a ordem (`primeiros_buscar`).
  Dados inalterados.

### 0.3.0 — 25/ago/2026
- `buscar`: consulta por palavras e filtro `componente="CO"` (issues #8 e #9);
  paridade com o npm 0.4.0 mantida pelas mesmas fixtures. Dados inalterados.

### 0.2.1 — ago/2026
- Dados atualizados para `dados-2026.07.1` (11 textos corrigidos); paridade com
  o npm 0.3.2 mantida pelas mesmas fixtures.

### 0.2.0 — jul/2026
- Complemento de Computação; paridade com o npm mantida pelas mesmas fixtures.

### 0.1.0 — 09/jul/2026
- Pré-release: API equivalente em snake_case.

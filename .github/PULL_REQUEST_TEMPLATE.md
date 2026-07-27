<!--
Obrigado por contribuir. Preencha o que se aplica e apague o resto.
Mudança de API pública precisa de discussão prévia em issue: afeta consumidores dos três pacotes.
-->

## O que muda

<!-- Uma ou duas frases. Se resolve uma issue, escreva "Resolve #123". -->

## Categoria

- [ ] `correcao` (bug em consulta, decodificação, tool do MCP)
- [ ] `api` (nova consulta ou mudança de assinatura; discutida antes em issue)
- [ ] `mcp` (tool nova ou mudança de descrição/schema de tool)
- [ ] `dados` (sincronização de nova data-version do bncc-dados)
- [ ] `editorial` (docs, tooling, CI, sem mudança de comportamento)

## A regra de ouro

- [ ] **Não reimplementei consulta.** A lógica nova (se houver) entrou no núcleo
      injetável (`packages/bncc/src/nucleo.ts`) e os consumidores a recebem por
      injeção, em vez de duplicarem lookup, busca ou decodificação.

Se você precisou escrever a mesma lógica duas vezes no mesmo runtime, pare e
abra uma issue: é sinal de que falta algo no núcleo. Ver [CONTRIBUTING.md](../CONTRIBUTING.md).

## Paridade npm × PyPI

- [ ] Mudança de API aplicada **nos dois** pacotes (`packages/bncc/src/` e
      `python/bncc/_consultas.py`), ou não se aplica.
- [ ] Caso novo em `fixtures/consultas-douradas.json`, ou não se aplica.
- [ ] Não ajustei a fixture dourada só para um teste passar.

## Checklist

- [ ] `pnpm -r build && pnpm -r test` passa.
- [ ] `cd python && uv run pytest` passa.
- [ ] Não editei `packages/bncc/dados/` nem `python/bncc/dados/` à mão.
- [ ] Se a mudança afeta quem consome os pacotes, atualizei o `CHANGELOG.md` na
      seção "Não publicado".
- [ ] Se tomei uma decisão de design não óbvia, registrei em `DECISOES.md`.

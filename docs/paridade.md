# Paridade npm × PyPI · o contrato das consultas douradas

O risco número 1 desta fase (registrado no plano do projeto) é os pacotes npm e PyPI divergirem silenciosamente. Este documento descreve o mecanismo que impede isso.

## O mecanismo

`fixtures/consultas-douradas.json` é um único arquivo de casos de teste, executado por dois runners:

- `packages/bncc/test/consultas-douradas.test.ts` (vitest, pacote npm)
- `python/tests/test_douradas.py` (pytest, pacote PyPI)

Os dois rodam no CI a cada push. Se qualquer um vermelhar, a paridade quebrou. Não existe "atualizar só um lado".

## Formato de um caso

```json
{
  "id": "C3-lp-ano6-leitura",
  "operacao": "contar_habilidadesEF",
  "args": { "componente": "LP", "ano": 6, "pratica": "Leitura" },
  "esperado": 37,
  "nota": "opcional: contexto do caso"
}
```

- `id`: nome do teste. Prefixo `C*` indica consulta do caso de uso âncora do projeto (teste de aceitação do dataset).
- `operacao`: uma das operações que os runners conhecem (`decodificar`, `porCodigo`, `contar_habilidadesEF`, `contar_uniao_anos_ef`, `contar_habilidadesEM`, `contar_objetivosEI`, `contar_buscar`, `progressaoEI_codigos`, `estatisticas` e as variantes `_erro`).
- `args`/`esperado`: em camelCase (a convenção do runner TS). O runner Python converte mecanicamente camelCase→snake_case para chaves de argumento e de resultado.
- Asserções abstratas (`praticaLinguagem`, `competenciasNumeros`, `temLocalizadorPdf`) são interpretadas por cada runner contra a estrutura do seu pacote; a semântica é a mesma.

## Regras do contrato

1. **A fixture só muda por três motivos**: (a) mudança de dado com justificativa no changelog do bncc-dados; (b) nova operação de API (implementada nos DOIS pacotes primeiro); (c) novo caso de cobertura. Nunca "para o teste passar".
2. **Um runner novo não adapta a fixture; adapta-se a ela.** Se o runner Python precisasse mudar a fixture para passar, isso seria uma divergência do pacote Python (foi exatamente assim que validamos o M3: 23/23 sem tocar o arquivo).
3. **Toda operação nova da API ganha pelo menos um caso.** API sem caso dourado é API sem prova de paridade.
4. **Valores esperados vêm do dataset validado**, capturados por execução e conferidos contra o relatório de validação do bncc-dados quando aplicável (ex.: contagens do caso âncora).

## Origem dos valores atuais

Capturados em 09/07/2026 sobre `dados-2026.07` (1.580 aprendizagens), conferidos com o relatório de validação do bncc-dados (ex.: C2 = 238 habilidades de LP nos anos 3º a 6º; estatísticas = contagens-gabarito do pipeline).

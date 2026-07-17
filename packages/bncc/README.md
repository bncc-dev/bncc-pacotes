# @bncc/dados

A BNCC (Base Nacional Comum Curricular) como dados estruturados e verificados, com API de consulta tipada em português. Inclui o complemento de Computação (Parecer CNE/CEB 2/2022). Dados embutidos, zero dependências, zero rede.

Cada registro é rastreável à fonte oficial (planilha do MEC + página do PDF homologado). Fonte dos dados: [bncc-dados](https://github.com/bncc-dev/bncc-dados), extração reprodutível com validação em CI.

**Pré-release.** A versão 1.0 sai junto da release `dados-v1.0.0` do bncc-dados, após o registro da revisão pedagógica.

## Uso

```ts
import { porCodigo, buscar, habilidadesEF, objetivosEI, decodificar, progressaoEI } from '@bncc/dados';

// registro completo, com nomes resolvidos e fonte oficial
const h = porCodigo('EF67LP08');
h.texto;                               // enunciado oficial verificado
h.organizacao.nomes.praticaLinguagem;  // 'Leitura'
h.fonte.localizador_pdf;               // 'Base-Nacional-...pdf, página PDF 167'

// filtros estruturados
habilidadesEF({ componente: 'LP', ano: 6, pratica: 'Leitura' });   // 37 habilidades
habilidadesEM({ area: 'LGG', competencia: 1 });
objetivosEI({ campo: 'TS', grupoEtario: '02' });

// busca textual (normalizada: acentos e caixa não importam)
buscar('frações', { etapa: 'EF', componente: 'MA' });

// decodificação de códigos (as três gramáticas oficiais)
decodificar('EM13LGG103');  // { etapa: 'EM', area: 'LGG', competenciaEspecifica: 1, ... }

// progressão oficial da Educação Infantil entre faixas etárias
progressaoEI('EI02TS01');   // EI01TS01 → EI02TS01 → EI03TS01
```

## API

| Função | O que faz |
|---|---|
| `porCodigo(codigo)` | Registro completo pelo código (case-insensitive), com contexto resolvido |
| `decodificar(codigo)` | Estrutura do código: etapa, anos, componente/área, competência, sequência |
| `habilidadesEF(filtro?)` | Ensino Fundamental: por componente, ano, unidade temática, prática, campo de atuação |
| `habilidadesEM(filtro?)` | Ensino Médio: por área, competência, só Língua Portuguesa |
| `objetivosEI(filtro?)` | Educação Infantil: por campo de experiências e grupo etário |
| `buscar(texto, filtro?)` | Busca textual normalizada nos enunciados |
| `progressaoEI(codigo)` | Objetivos do mesmo aspecto nas três faixas etárias (alinhamento oficial) |
| `estrutura()` | Espinha estrutural: etapas, áreas, componentes, competências, recortes |
| `estatisticas()` | Contagens do dataset |
| `versao()` | Data-version, commit de origem e checksums dos dados embutidos |

Regras que o pacote respeita (e você deveria também): códigos que não existem lançam erro em vez de inventar; a numeração tem lacunas legítimas; registros trazem `vigencia` para filtrar aprendizagens revogadas em versões futuras.

## Uso sem sistema de arquivos (Workers, Deno Deploy, bundlers)

A entrada padrão carrega os JSONs embutidos do disco. Em runtimes sem `fs`, importe o núcleo injetável e alimente-o com os dados (que o pacote também exporta como JSON):

```ts
import { criarConsultas } from '@bncc/dados/nucleo';
import estrutura from '@bncc/dados/dados/estrutura.json';
import educacaoInfantil from '@bncc/dados/dados/educacao-infantil.json';
import ensinoFundamental from '@bncc/dados/dados/ensino-fundamental.json';
import ensinoMedio from '@bncc/dados/dados/ensino-medio.json';

const bncc = criarConsultas({ estrutura, educacaoInfantil, ensinoFundamental, ensinoMedio });
bncc.porCodigo('EF67LP08').texto;
```

O complemento de Computação é opcional no núcleo: injete também `computacao` (de `@bncc/dados/dados/computacao.json`) para incluí-lo. A API padrão do pacote já o carrega.

A mesma API (`porCodigo`, `buscar`, `habilidadesEF`...), a mesma semântica. É o caminho usado pela API hospedada do bncc.dev.

## Números

1.721 aprendizagens: 1.580 da BNCC 2018 (93 EI + 1.304 EF + 183 EM) + 141 do complemento de Computação (11 EI + 104 EF + 26 EM) · 10 competências gerais · 105 específicas · 885 contextos de organização · install até a primeira consulta em ~1 segundo.

Projeto **bncc.dev**, mantido pela Profy. Dados CC BY 4.0, código MIT.

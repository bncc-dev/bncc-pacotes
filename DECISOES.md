# Decisões

Registro das escolhas que não são óbvias a partir do código, para que ninguém
precise arqueologia de commit para entender por quê. Mesmo formato do
[bncc-dados](https://github.com/bncc-dev/bncc-dados) e do
[bncc-benchmark](https://github.com/bncc-dev/bncc-benchmark).

## D1 · Monorepo para npm, PyPI e MCP

**Decisão:** os três pacotes ficam no mesmo repositório.

**Por quê:** três mecanismos dependem disso. (a) `scripts/sincronizar-dados.mjs`
atualiza os dados dos dois pacotes em um comando, com o mesmo commit e
checksums, tornando o drift de data-version estruturalmente impossível.
(b) `fixtures/consultas-douradas.json` é um arquivo só, executado pelo vitest e
pelo pytest: é a prova de paridade, e em repos separados viraria cópia
dessincronizada. (c) O workspace pnpm faz o MCP buildar contra o `@bncc/dados`
local, não contra uma versão publicada.

**Custo aceito:** tooling misto (pnpm + uv) e histórico compartilhado.

## D2 · O que sai do monorepo

**Decisão:** o que não compartilha o dataset não fica.

**Consequências:** o site saiu em jul/2026 para o
[bncc-site](https://github.com/bncc-dev/bncc-site); o `contato-worker` o seguiu
em jul/2026 (era o backend do formulário de contato, sem um único import daqui).
O `mcp-worker` ficou, apesar de também ser um Worker Cloudflare: ele importa
`@bncc/mcp/tools` e `@bncc/dados/nucleo` via `workspace:*` e precisa buildar
contra o código local.

## D3 · API em português, convenção de cada ecossistema

**Decisão:** `porCodigo()` no npm (camelCase), `por_codigo()` no PyPI
(snake_case). Mesma semântica, nomes na convenção de cada linguagem.

**Por quê:** o público é dev brasileiro e o dado é pt-BR. Traduzir a API para
inglês criaria uma camada de tradução mental sobre um vocabulário
(competência, habilidade, campo de experiências) que não tem equivalente
estável em inglês.

## D4 · Núcleo injetável como única superfície de consulta

**Decisão:** toda a lógica de consulta vive em `criarConsultas(dados)`
(`packages/bncc/src/nucleo.ts`), sem tocar em sistema de arquivos. As cascas
(fs, MCP stdio, MCP remoto) só injetam dados e delegam.

**Por quê:** permite rodar em runtimes sem fs (Cloudflare Workers) e, mais
importante, impede que o MCP responda diferente da lib com o mesmo dado. Virou
a regra de ouro do [CONTRIBUTING.md](CONTRIBUTING.md).

## D5 · Dados embutidos, zero rede, zero dependências

**Decisão:** os JSONs viajam dentro do pacote; nenhuma consulta faz I/O de rede.

**Por quê:** previsibilidade e offline. O custo é tarball maior (~2 MB) e a
necessidade de republicar a cada atualização de dado, aceito em troca de não ter
serviço no caminho de uma consulta. Quem quer dado sempre fresco usa a
api.bncc.dev.

## D6 · `pnpm publish`, nunca `npm publish`

**Decisão:** publicação sempre por pnpm.

**Por quê:** só o pnpm converte o `workspace:*` do MCP para a versão real.
Publicar com npm gerou pacote ininstalável no `@bncc/mcp@0.1.0`, depreciado em
09/07/2026. Está no CONTRIBUTING e no runbook.

## D7 · Licenças separadas para código e dados

**Decisão:** MIT para o código, CC BY 4.0 para os JSONs embutidos, em arquivos
distintos (`LICENSE-CODIGO.md` e `LICENSE-DADOS.md`), com o `LICENSE` explicando
a divisão. Nome e identidade visual ficam fora de ambas.

**Por quê:** o mesmo artefato publicado carrega as duas naturezas, e uma licença
única mentiria sobre uma delas. Modelo herdado do bncc-benchmark.

## D9 · O gate `dados-v1.0.0` vale para o `1.0.0`, não para as pré-releases

**Decisão:** pré-releases `0.x` dos pacotes podem ser publicadas antes da release
`dados-v1.0.0` do bncc-dados. O gate continua valendo para o marco `1.0.0`.

**Por quê:** o gate existe para proteger a **revisão pedagógica do dado**, não a
superfície de código. Ler a regra como "nada sai até a 1.0" travava a
`@bncc/mcp@0.2.0`, cujo export `./tools` é o que permite ao MCP remoto e a outros
consumidores reusarem as tools. Sem ela publicada, o repositório aberto
documentava uma superfície que ninguém conseguia instalar, e o bncc-playground
seguia preso a um tarball vendorizado (`vendor/bncc-mcp-0.2.0.tgz`) em vez de
consumir o pacote público.

**Aplicado em:** `@bncc/mcp@0.2.0`, publicada em 27/jul/2026.

**O que não mudou:** publicação continua exigindo credencial interativa do
mantenedor, e continua sendo sempre `pnpm publish` (D6).

## D8 · `sincronizado_de` grava só o nome do diretório

**Decisão:** o `VERSAO.json` registra `"sincronizado_de": "bncc-dados"`, não o
caminho absoluto.

**Por quê:** o arquivo viaja dentro do tarball do npm e do wheel do PyPI. Até a
`@bncc/dados@0.3.1` e a `bncc 0.2.0`, ele publicou o caminho pessoal da máquina
de quem sincronizou. O que identifica a origem de forma reprodutível é o campo
`commit`, que continua lá. Achado da auditoria de abertura; ver
`docs/plano-abertura.md` (interno).

## D10 · Busca com ranking determinístico, sem dependências (issue #14)

**Decisão:** `buscar()` ordena por relevância e a regra é a mesma nos dois
pacotes, escrita à mão, sem biblioteca (regra 6):

1. **Tokens.** Normalização de sempre (acentos, caixa, pontuação), depois
   remoção de uma lista fixa de palavras vazias do português e redução a
   radical por regras curtas: plural (`coes→cao`, `oes→ao`, `ais→al`, ...,
   `s→∅`), sufixos fortes (`mente`, `cao→c`, `ao`), vogal final de gênero e
   quatro derivacionais (`cionari→c`, `cional→c`, `idad`, `ment`). Não é um
   stemmer completo: o alvo é `fracao`, `fracoes` e `fracionario` no mesmo
   radical sem que `texto` case `contexto`. Colisões conhecidas e aceitas:
   `conta`/`conto`, `lida`/`lido`, `educacao`/`educacional` (viram o mesmo
   radical). A tabela palavra→radical é teste unitário nos dois pacotes.
2. **Índice.** Enunciado mais os nomes dos campos estruturais (componente,
   área, campo de experiências, eixo, unidade temática ou prática de
   linguagem, objetos de conhecimento), com peso 0,5. O dado já é
   estruturado; é o "contextual retrieval" de graça.
3. **Pontuação.** BM25 com k1 = 1,2 e b = 0,75, arredondada a 3 casas e
   devolvida no campo `pontuacao` de cada resultado.
4. **Estratos.** Primeiro, o enunciado idêntico à consulta; depois (A) casam
   todos os radicais e contêm a consulta literal; (B) casam todos os radicais;
   (C) casam parte deles, **só quando os anteriores estão vazios**. Dentro de
   cada um, pontuação decrescente e empate por código. O estrato do idêntico
   existe porque um enunciado mais longo que contém a consulta pode pontuar
   mais no BM25 (EF08GE05 contém o texto de EF08HI06). Buscando cada uma das
   1.721 aprendizagens pelo próprio enunciado, 16 não vêm em primeiro: todas
   têm texto idêntico ao de outro código (ex.: EF69CO02 e EF06CO02), e o
   empate por código decide. O estrato literal só se aplica a consultas de duas ou mais
   palavras; com uma só, ele reintroduziria a diferença singular/plural que o
   radical acabou de apagar.
5. **Ordem conferida pela fixture.** Operação `primeiros_buscar`
   (`docs/paridade.md`): os N primeiros códigos, posição a posição, iguais em
   TS e Python.

**Por quê:** na 0.4.0, `fração` e `frações` devolviam conjuntos disjuntos e
`de` casava 94% da Base; sem ordem, `texto` devolvia 394 registros (254 só por
substring, como `contexto`) e o cliente via os primeiros do dataset. Para uma
fonte anti-alucinação, zero ou ruído confirmam ao modelo que o dado não existe.
O "sem ranking" da 0.4.0 (#9) foi o passo intermediário possível sem mudar a
API; a regra que continua é a de explicabilidade: a descrição da tool diz, numa
frase, como ordena, e a ordem é reproduzível nos dois pacotes.

**Por que o parcial é última passada e não padrão:** com casamento parcial
sempre ligado, o enunciado completo de EF05CO11 passaria de `total` 1 para 47
e o de EI01ET06 para 422. O `total` deixaria de servir ao caso de uso de
lookup inverso (enunciado → código), que foi o motivo de #9. Medido em
26/09/2026.

**Uma só implementação, também no navegador (0.6.0):** as interfaces com
busca própria (bncc.dev, verso) filtravam por substring no navegador, cada uma
com sua regra. A lógica de ranking foi extraída para funções puras no subpath
`@bncc/dados/busca` (sem dados, sem Node): `prepararIndice` e `ranquear`. O
`buscar()` do pacote usa as mesmas funções, e `indiceBusca()` entrega a forma
serializável do índice (radicais do enunciado e dos campos por aprendizagem).
Uma interface web serve esse índice como JSON e obtém a mesma ordem e a mesma
pontuação de `buscar()`, sem carregar os dados completos. Um teste nos dois
pacotes prova a equivalência para todas as consultas de busca da fixture.

**O que fica de fora:** busca semântica por embeddings. É camada inferida,
precisa de modelo e de rótulo próprio; outra decisão, se a léxica não bastar.
Também fica de fora, por ora, um golden set de busca com taxa de acerto
medida; a issue #14 o sugere a partir do bncc-benchmark, mas ele não existe
neste repositório.

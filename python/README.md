# bncc

A BNCC (Base Nacional Comum Curricular) como dados estruturados e verificados, com API de consulta em português. Dados embutidos, zero dependências, zero rede.

Cada registro é rastreável à fonte oficial (planilha do MEC + página do PDF homologado). Fonte dos dados: [bncc-dados](https://github.com/bncc-dev/bncc-dados), extração reprodutível com validação em CI. Paridade com o pacote npm [@bncc/dados](https://www.npmjs.com/package/@bncc/dados) provada por consultas douradas compartilhadas.

**Pré-release.** A versão 1.0 sai junto da release `dados-v1.0.0` do bncc-dados, após o registro da revisão pedagógica.

## Uso

```python
import bncc

# registro completo, com nomes resolvidos e fonte oficial
h = bncc.por_codigo('EF67LP08')
h['texto']                                          # enunciado oficial verificado
h['organizacao']['nomes']['pratica_linguagem']      # 'Leitura'
h['fonte']['localizador_pdf']                       # 'Base-Nacional-...pdf, página PDF 167'

# filtros estruturados
bncc.habilidades_ef(componente='LP', ano=6, pratica='Leitura')   # 37 habilidades
bncc.habilidades_em(area='LGG', competencia=1)
bncc.objetivos_ei(campo='TS', grupo_etario='02')

# busca textual (acentos, caixa e pontuação não importam; trecho contíguo ou, se não houver, todas as palavras em qualquer ordem)
bncc.buscar('frações', etapa='EF', componente='MA')

# decodificação de códigos (as três gramáticas oficiais)
bncc.decodificar('EM13LGG103')

# progressão oficial da Educação Infantil entre faixas etárias
bncc.progressao_ei('EI02TS01')   # EI01TS01 -> EI02TS01 -> EI03TS01

# pandas (extra opcional: pip install bncc[pandas])
df = bncc.para_dataframe('EF')   # 1.304 linhas
```

## API

`por_codigo` · `decodificar` · `habilidades_ef` · `habilidades_em` · `objetivos_ei` · `buscar` · `progressao_ei` · `estrutura` · `estatisticas` · `versao` · `para_dataframe`

Regras que o pacote respeita: códigos inexistentes lançam `ValueError` em vez de inventar; a numeração tem lacunas legítimas; registros trazem `vigencia` para filtrar aprendizagens revogadas em versões futuras.

## Números

1.721 aprendizagens: 1.580 da BNCC 2018 (93 EI + 1.304 EF + 183 EM) + 141 do complemento de Computação (Parecer CNE/CEB 2/2022) · 10 competências gerais · 105 específicas.

Projeto **bncc.dev**, mantido pela Profy. Dados CC BY 4.0, código MIT.

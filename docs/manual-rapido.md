# Manual rápido · pacotes e MCP do bncc.dev

Como consumir os dados da BNCC em cada interface, no menor caminho possível. Público: dev chegando agora (e a base da futura página de docs do site).

## 1. npm · `@bncc/dados` (TypeScript/JavaScript)

Requisito: Node 18+.

```bash
npm install @bncc/dados       # dados embutidos: sem rede, sem key, zero dependências
```

```ts
import {
  porCodigo, buscar, habilidadesEF, habilidadesEM, objetivosEI,
  progressaoEI, decodificar, estrutura, estatisticas, versao,
} from '@bncc/dados';

// Lookup por código (case-insensitive), com nomes resolvidos e fonte oficial
porCodigo('EF67LP08').texto;              // "Identificar os efeitos de sentido..."
porCodigo('EF67LP08').componente.nome;    // "Língua Portuguesa"
porCodigo('EF67LP08').fonte;              // planilha oficial + página do PDF homologado

// Listagens com filtros (aceita sigla 'LP' ou id 'ef-comp-lp')
habilidadesEF({ componente: 'LP', ano: 6 });          // 34 habilidades
habilidadesEF({ componente: 'MA', unidadeTematica: 'Números' });
habilidadesEM({ area: 'LGG', competencia: 1 });       // EM por área e competência
objetivosEI({ campo: 'TS', grupoEtario: '02' });      // EI por campo e faixa etária

// Busca textual (ignora acentos, caixa e pontuação; trecho contíguo ou, se não houver, todas as palavras em qualquer ordem)
buscar('fake news');                       // [EM13LP39, EM13LP40]
buscar('frações', { etapa: 'EF', ano: 5 });

// Extras
decodificar('EM13LGG103');    // anatomia do código: etapa, área, competência, sequência
progressaoEI('EI02TS01');     // o mesmo objetivo nas 3 faixas etárias (alinhamento oficial)
estrutura();                  // etapas, áreas, componentes, campos, competências
estatisticas();               // { total: 1580, ensinoFundamental: 1304, ... }
versao();                     // { data_version: 'dados-2026.07', commit, checksums }
```

**Anti-alucinação por design**: código que não existe **lança erro** explicativo ("a numeração da BNCC tem lacunas legítimas"), nunca null silencioso.

**Runtimes sem filesystem** (Cloudflare Workers etc.): use `@bncc/dados/nucleo` + os JSONs pelos subpaths `@bncc/dados/dados/*.json`. Exemplo completo no README do pacote.

## 2. PyPI · `bncc` (Python 3.10 ou superior)

⚠️ **Não use o `pip` solto do sistema**: no macOS ele costuma apontar para o Python 3.9 da Apple, antigo demais para o pacote (o erro será `Requires-Python >=3.10`). Use `uv` ou um venv com interpretador explícito.

**Experimentar em 10 segundos** (com `uv`, resolve tudo sozinho):

```bash
uv run --with bncc python
>>> import bncc
>>> bncc.por_codigo('EF67LP08')['texto']
```

**Ambiente de projeto:**

```bash
uv venv ~/venvs/bncc && source ~/venvs/bncc/bin/activate
uv pip install bncc            # ou: pip install 'bncc[pandas]' para o extra de DataFrames

# sem uv, com o Python do Homebrew:
python3.13 -m venv ~/venvs/bncc && source ~/venvs/bncc/bin/activate && pip install bncc
```

**Uso** (mesma semântica do npm, em snake_case):

```python
import bncc

bncc.por_codigo('EF67LP08')['texto']
bncc.habilidades_ef(componente='LP', ano=6)
bncc.habilidades_em(area='LGG', competencia=1)
bncc.objetivos_ei(campo='TS', grupo_etario='02')
bncc.buscar('frações', etapa='EF', ano=5)
bncc.progressao_ei('EI02TS01')
bncc.decodificar('EF67LP08')
bncc.estrutura(); bncc.estatisticas(); bncc.versao()

# Com o extra pandas:
df = bncc.para_dataframe(etapa='EF')      # DataFrame com as 1.304 do Fundamental
df.groupby('componente').size()
```

A paridade npm ↔ PyPI é garantida por fixtures compartilhadas (`fixtures/consultas-douradas.json`) que rodam no CI dos dois pacotes.

## 3. MCP · `@bncc/mcp` (assistentes de IA)

Conecta Claude Code, Claude Desktop, Cursor e afins direto aos dados. Requisito: Node 18+ (o `npx` cuida do resto).

**Claude Code** (um comando):

```bash
claude mcp add bncc -- npx -y @bncc/mcp
```

**Claude Desktop / Cursor** (no JSON de configuração):

```json
{ "mcpServers": { "bncc": { "command": "npx", "args": ["-y", "@bncc/mcp"] } } }
```

**As 7 tools** que o assistente ganha:

| Tool | O que faz |
|---|---|
| `bncc_lookup` | registro completo por código |
| `bncc_buscar` | busca textual com filtros |
| `bncc_listar` | listagens por etapa/componente/ano/área/campo (com `limite` + `total`) |
| `bncc_decodificar` | anatomia de um código |
| `bncc_progressao_ei` | progressão oficial da EI entre faixas etárias |
| `bncc_estrutura` | a espinha estrutural da Base |
| `bncc_estatisticas` | contagens + versão dos dados |

**Pedidos que passam a funcionar com dados reais**: "Monte um plano de aula de frações para o 5º ano citando os códigos da BNCC" · "Quais habilidades de LP do 6º ano tratam de leitura?" · "EF67LP99 existe?" (não existe, e o assistente explica o porquê em vez de inventar).

## 4. Sem instalar nada

- **API REST**: `curl https://api.bncc.dev/v1/aprendizagens/EF67LP08` · spec completa em `https://api.bncc.dev/v1/openapi.json`
- **Site**: https://bncc.dev (busca, navegação por etapa, competências, CSVs por listagem)
- **Dataset bruto**: JSON, SQLite e CSV no repo [`bncc-dev/bncc-dados`](https://github.com/bncc-dev/bncc-dados) (CC BY 4.0)

---

Versões mínimas dos exemplos: `@bncc/dados` 0.2+, `bncc` 0.1+, `@bncc/mcp` 0.1.1+. Dados embutidos: consulte `versao()` / `bncc.versao()` para a data-version em uso.

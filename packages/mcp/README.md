# @bncc/mcp

Servidor MCP da BNCC: as 1.721 aprendizagens da Base Nacional Comum Curricular e do complemento de Computação, verificadas e com fonte oficial, como tools para agentes de IA. Casca fina sobre o [@bncc/dados](https://www.npmjs.com/package/@bncc/dados): dados embutidos, zero rede.

**Pré-release.** Publicação junto da release `dados-v1.0.0` do [bncc-dados](https://github.com/bncc-dev/bncc-dados).

## Instalação

Claude Code:

```bash
claude mcp add bncc -- npx -y @bncc/mcp
```

Cursor e outros clientes MCP (stdio):

```json
{ "mcpServers": { "bncc": { "command": "npx", "args": ["-y", "@bncc/mcp"] } } }
```

Desenvolvimento local (antes da publicação):

```bash
pnpm install && pnpm build
claude mcp add bncc-local -- node caminho/para/packages/mcp/dist/servidor.js
```

## Tools

| Tool | Para quê |
|---|---|
| `bncc_lookup` | Registro completo pelo código, com contexto resolvido e fonte oficial (página do PDF homologado) |
| `bncc_buscar` | Busca textual normalizada nos enunciados, com filtros e limite |
| `bncc_listar` | Listagem estruturada por etapa/componente/ano/área/campo (cobertura curricular) |
| `bncc_decodificar` | Anatomia de um código (etapa, anos, componente, competência, sequência) |
| `bncc_progressao_ei` | Objetivos do mesmo aspecto nas 3 faixas etárias da Educação Infantil (alinhamento oficial) |
| `bncc_estrutura` | Etapas, áreas, componentes, competências gerais e específicas, recortes, EJA |
| `bncc_estatisticas` | Contagens e data-version dos dados embutidos |

Convergência de nomes com o bncc-mcp pioneiro (dfdb76) nas 4 tools equivalentes. Sem a camada Mapa de Foco (licença CC BY-NC do Instituto Reúna).

As respostas incluem sempre a fonte oficial; erros explicam em vez de inventar ("a numeração da BNCC tem lacunas legítimas").

Testado ponta a ponta no Claude Code (health-check ✔ Connected em 09/07/2026).

Projeto **bncc.dev**, mantido pela Profy. Dados CC BY 4.0, código MIT.

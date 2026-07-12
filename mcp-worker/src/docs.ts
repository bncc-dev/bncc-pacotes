/**
 * Página mínima de documentação servida em GET / para navegadores.
 * Existe para quem chega direto pelo domínio; a apresentação completa vive no
 * site (bncc.dev/desenvolve/). Copy sem travessão (convenção do projeto).
 */
export function paginaDocs(dataVersion: string, versaoServidor: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mcp.bncc.dev · a BNCC como servidor MCP remoto</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; max-width: 46rem; margin: 3rem auto; padding: 0 1rem; }
  h1 { font-size: 1.3rem; } h2 { font-size: 1.05rem; margin-top: 2rem; }
  code, pre { background: rgba(125,125,125,.12); border-radius: 4px; padding: .1em .35em; }
  pre { padding: .7em; overflow-x: auto; } table { border-collapse: collapse; width: 100%; font-size: .92em; }
  td, th { text-align: left; padding: .3em .6em .3em 0; border-bottom: 1px solid rgba(125,125,125,.25); vertical-align: top; }
  .beta { color: #b45309; font-weight: 600; } a { color: #1a6e42; }
  @media (prefers-color-scheme: dark) { a { color: #46c07a; } }
</style>
</head>
<body>
<h1>mcp.bncc.dev <span class="beta">beta</span></h1>
<p>A Base Nacional Comum Curricular como servidor <a href="https://modelcontextprotocol.io">MCP</a> remoto: aberto, gratuito, sem cadastro e sem API key. Seu agente de IA consulta as aprendizagens verificadas em vez de alucinar códigos. Dados conferidos contra os documentos oficiais do MEC (data-version <code>${dataVersion}</code>).</p>
<pre>https://mcp.bncc.dev/mcp</pre>

<h2>Como conectar</h2>
<table>
<tr><th>Cliente</th><th>Passos</th></tr>
<tr><td>Claude</td><td>Settings &rsaquo; Connectors &rsaquo; Add custom connector &rsaquo; cole a URL acima</td></tr>
<tr><td>ChatGPT</td><td>Settings &rsaquo; Connectors &rsaquo; ative o modo desenvolvedor &rsaquo; novo conector com a URL acima</td></tr>
<tr><td>Cursor</td><td>no <code>.cursor/mcp.json</code>: <code>{ "mcpServers": { "bncc": { "url": "https://mcp.bncc.dev/mcp" } } }</code></td></tr>
<tr><td>Claude Code</td><td><code>claude mcp add --transport http bncc https://mcp.bncc.dev/mcp</code></td></tr>
</table>

<h2>As 7 tools</h2>
<table>
<tr><td><code>bncc_lookup</code></td><td>registro completo e verificado de uma aprendizagem pelo código</td></tr>
<tr><td><code>bncc_buscar</code></td><td>busca textual nos enunciados oficiais</td></tr>
<tr><td><code>bncc_listar</code></td><td>listagem por etapa, componente, ano, área ou campo</td></tr>
<tr><td><code>bncc_decodificar</code></td><td>anatomia de um código BNCC (sem consultar o dataset)</td></tr>
<tr><td><code>bncc_progressao_ei</code></td><td>alinhamento de um objetivo da Educação Infantil entre as três faixas etárias</td></tr>
<tr><td><code>bncc_estrutura</code></td><td>etapas, áreas, componentes, competências, campos de experiências</td></tr>
<tr><td><code>bncc_estatisticas</code></td><td>contagens do dataset e versão dos dados</td></tr>
</table>

<h2>Limites e alternativa local</h2>
<p>Limite de requisições por IP para proteger o serviço. Para uso intensivo ou offline, rode o mesmo servidor localmente, com os mesmos dados embutidos: <code>npx -y @bncc/mcp</code>.</p>

<p>Projeto <a href="https://bncc.dev">bncc.dev</a> · dados CC BY 4.0, código MIT · servidor v${versaoServidor} · fonte: <a href="https://github.com/bncc-dev/bncc-pacotes">github.com/bncc-dev/bncc-pacotes</a></p>
</body>
</html>`;
}

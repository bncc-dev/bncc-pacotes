/** E2E do servidor MCP real: sobe dist/servidor.js via stdio e consulta. */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transporte = new StdioClientTransport({
  command: 'node',
  args: [new URL('../dist/servidor.js', import.meta.url).pathname],
});
const cliente = new Client({ name: 'e2e', version: '0.0.1' });
await cliente.connect(transporte);

const { tools } = await cliente.listTools();
console.log(`tools expostas: ${tools.length} (${tools.map((t) => t.name).join(', ')})`);

const r = await cliente.callTool({ name: 'bncc_lookup', arguments: { codigo: 'EM13LGG103' } });
const reg = JSON.parse(r.content[0].text);
console.log(`lookup EM13LGG103: competência ${reg.competenciasEspecificas[0].numero} · ${reg.texto.slice(0, 60)}…`);

const s = await cliente.callTool({ name: 'bncc_estatisticas', arguments: {} });
const stats = JSON.parse(s.content[0].text);
console.log(`estatísticas: ${stats.total} aprendizagens · ${stats.versao.data_version}`);

await cliente.close();
console.log('e2e stdio: OK');

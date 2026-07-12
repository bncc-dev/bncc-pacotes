/**
 * Testes do worker MCP remoto. O Hono roda em Node aqui (app.request), sem
 * Workers; o binding de rate limit é injetado como stub quando o teste
 * precisa dele. A correção dos DADOS é coberta pelas consultas douradas do
 * @bncc/dados e o roteamento das tools pelos testes do @bncc/mcp; aqui se
 * testa o transporte HTTP: handshake, CORS, limites e erros pedagógicos.
 */
import { describe, expect, it } from 'vitest';
import app from '../src/index.js';

/**
 * POST JSON-RPC com Accept duplo; extrai a mensagem de resposta seja ela
 * application/json ou text/event-stream (linhas "data:").
 */
async function rpc(corpo: unknown, env?: Record<string, unknown>, caminho = '/mcp'): Promise<{ res: Response; msg: any }> {
  const res = await app.request(caminho, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(corpo),
  }, env);
  const tipo = res.headers.get('content-type') ?? '';
  let msg: any = null;
  if (tipo.includes('application/json')) {
    msg = JSON.parse(await res.text());
  } else if (tipo.includes('text/event-stream')) {
    const linhas = (await res.text()).split('\n').filter((l) => l.startsWith('data:'));
    msg = linhas.length ? JSON.parse(linhas[linhas.length - 1].slice(5).trim()) : null;
  }
  return { res, msg };
}

const initialize = (id = 1) => ({
  jsonrpc: '2.0', id, method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'teste', version: '0.0.1' } },
});

const toolCall = (name: string, args: Record<string, unknown>, id = 2) => ({
  jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args },
});

/** Desembrulha o JSON do primeiro content de um resultado de tools/call. */
const conteudo = (msg: any) => JSON.parse(msg.result.content[0].text);

describe('handshake MCP', () => {
  it('initialize responde com serverInfo e protocolo negociado', async () => {
    const { res, msg } = await rpc(initialize());
    expect(res.status).toBe(200);
    expect(msg.result.serverInfo.name).toBe('bncc');
    expect(msg.result.protocolVersion).toBeTruthy();
  });

  it('initialize traz instruções com contagem dinâmica e data-version', async () => {
    const { msg } = await rpc(initialize());
    expect(msg.result.instructions).toContain('1.580');
    expect(msg.result.instructions).toMatch(/Versão dos dados: dados-/);
  });

  it('notificação initialized é aceita com 202', async () => {
    const { res } = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(res.status).toBe(202);
  });
});

describe('tools via HTTP', () => {
  it('tools/list expõe exatamente as 7 tools', async () => {
    const { msg } = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(msg.result.tools.map((t: any) => t.name).sort()).toEqual([
      'bncc_buscar', 'bncc_decodificar', 'bncc_estatisticas', 'bncc_estrutura',
      'bncc_listar', 'bncc_lookup', 'bncc_progressao_ei',
    ]);
  });

  it('bncc_lookup devolve EF67LP08 com contexto e fonte', async () => {
    const { msg } = await rpc(toolCall('bncc_lookup', { codigo: 'EF67LP08' }));
    const r = conteudo(msg);
    expect(r.codigo).toBe('EF67LP08');
    expect(r.componente.nome).toBe('Língua Portuguesa');
    expect(r.fonte.localizador_pdf).toContain('página PDF');
  });

  it('bncc_lookup com código inexistente retorna isError pedagógico', async () => {
    const { msg } = await rpc(toolCall('bncc_lookup', { codigo: 'EF67LP99' }));
    expect(msg.result.isError).toBe(true);
    expect(conteudo(msg).erro).toMatch(/lacunas/i);
  });

  it('bncc_estatisticas traz total e a versão dos dados', async () => {
    const { msg } = await rpc(toolCall('bncc_estatisticas', {}));
    const r = conteudo(msg);
    expect(r.total).toBe(1580);
    expect(r.versao.data_version).toMatch(/^dados-/);
  });

  it('POST na raiz também atende MCP', async () => {
    const { msg } = await rpc(initialize(), undefined, '/');
    expect(msg.result.serverInfo.name).toBe('bncc');
  });
});

describe('camada HTTP', () => {
  it('GET / com Accept text/html devolve a página humana', async () => {
    const res = await app.request('/', { headers: { accept: 'text/html' } });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('mcp.bncc.dev');
  });

  it('GET /mcp sem html (stream SSE standalone) recebe 405 com dica', async () => {
    const res = await app.request('/mcp', { headers: { accept: 'text/event-stream' } });
    expect(res.status).toBe(405);
    const corpo = await res.json() as any;
    expect(corpo.erro).toMatch(/stateless/);
    expect(corpo.dica).toBeTruthy();
  });

  it('DELETE /mcp recebe 405: não há sessão', async () => {
    const res = await app.request('/mcp', { method: 'DELETE' });
    expect(res.status).toBe(405);
    expect(((await res.json()) as any).erro).toMatch(/sessão/);
  });

  it('preflight OPTIONS expõe os headers do protocolo MCP', async () => {
    const res = await app.request('/mcp', {
      method: 'OPTIONS',
      headers: { origin: 'https://exemplo.dev', 'access-control-request-method': 'POST', 'access-control-request-headers': 'mcp-session-id' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-headers')).toMatch(/mcp-session-id/i);
    expect(res.headers.get('access-control-expose-headers')).toMatch(/mcp-session-id/i);
  });

  it('rate limit negado responde 429 apontando o MCP local', async () => {
    const negar = { LIMITADOR: { limit: async () => ({ success: false }) } };
    const { res, msg } = await rpc(initialize(), negar);
    expect(res.status).toBe(429);
    expect(msg.dica).toContain('npx -y @bncc/mcp');
  });

  it('sem binding de rate limit o request segue normal', async () => {
    const permitir = { LIMITADOR: { limit: async () => ({ success: true }) } };
    const { msg } = await rpc(initialize(), permitir);
    expect(msg.result.serverInfo.name).toBe('bncc');
    const semBinding = await rpc(initialize());
    expect(semBinding.msg.result.serverInfo.name).toBe('bncc');
  });
});

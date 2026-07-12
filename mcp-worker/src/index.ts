/**
 * mcp-worker: o servidor MCP da BNCC como serviço remoto (mcp.bncc.dev).
 *
 * Streamable HTTP stateless: McpServer e transport novos por request (evita
 * colisão de IDs entre clientes); consultas, versão e instruções vivem no
 * escopo de módulo (1x no cold start). As tools vêm de @bncc/mcp/tools, as
 * mesmas 7 do stdio local: zero reimplementação.
 *
 * Regras transversais no padrão da casa: CORS liberado, rate limit por IP
 * quando o binding existe (produção; em dev e testes ele é ausente e o
 * servidor segue), erros que ensinam ({erro, dica}).
 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { instrucoesServidor, registrarTools } from '@bncc/mcp/tools';
import { bncc, versaoDados } from './dados.js';
import { paginaDocs } from './docs.js';
import pkg from '../package.json';

interface LimitadorPorIP {
  limit(opcoes: { key: string }): Promise<{ success: boolean }>;
}

type Ambiente = { Bindings: { LIMITADOR?: LimitadorPorIP } };

const INSTRUCOES = instrucoesServidor(bncc, versaoDados.data_version);

const app = new Hono<Ambiente>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  // Clientes MCP no navegador mandam e leem headers do protocolo.
  allowHeaders: ['Content-Type', 'Accept', 'Authorization', 'mcp-session-id', 'mcp-protocol-version', 'last-event-id'],
  exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
  maxAge: 86400,
}));

app.use('*', async (c, next) => {
  if (c.req.method === 'POST') {
    const limitador = c.env?.LIMITADOR;
    if (limitador) {
      const ip = c.req.header('cf-connecting-ip') ?? 'sem-ip';
      const { success } = await limitador.limit({ key: ip });
      if (!success) {
        return c.json({
          erro: 'Limite de requisições por IP excedido.',
          dica: 'O servidor remoto tem limite por IP para proteger o serviço. Para uso sem limite, rode o MCP localmente: npx -y @bncc/mcp (mesmos dados, mesmas 7 tools, zero rede).',
        }, 429);
      }
    }
  }
  await next();
  c.res.headers.set('X-BNCC-Data-Version', versaoDados.data_version);
});

// ---------------------------------------------------------------------- MCP

async function atenderMcp(c: Context<Ambiente>) {
  const servidor = new McpServer(
    { name: 'bncc', version: pkg.version },
    { instructions: INSTRUCOES },
  );
  registrarTools(servidor, bncc, versaoDados);
  const transporte = new StreamableHTTPTransport({
    sessionIdGenerator: undefined,   // stateless: nenhuma sessão para gerenciar
    enableJsonResponse: true,        // resposta JSON pura em vez de SSE por POST
  });
  await servidor.connect(transporte);
  const resposta = await transporte.handleRequest(c);
  // Notificações puras não têm resposta JSON-RPC; a spec pede 202 Accepted.
  return resposta ?? c.body(null, 202);
}

const ehNavegador = (c: Context) => (c.req.header('accept') ?? '').includes('text/html');

const paraHumanoOuErro = (c: Context) => {
  if (ehNavegador(c)) return c.html(paginaDocs(versaoDados.data_version, pkg.version));
  return c.json({
    erro: 'Este servidor é stateless e não mantém stream de notificações.',
    dica: 'Envie POST com as mensagens JSON-RPC do MCP. Tools e dados não mudam durante a sessão. Documentação humana: https://mcp.bncc.dev/ no navegador.',
  }, 405);
};

const semSessao = (c: Context) => c.json({
  erro: 'Não há sessão para encerrar: cada request é independente.',
  dica: 'Basta parar de enviar requests.',
}, 405);

app.post('/', atenderMcp);
app.post('/mcp', atenderMcp);
app.get('/', paraHumanoOuErro);
app.get('/mcp', paraHumanoOuErro);
app.delete('/', semSessao);
app.delete('/mcp', semSessao);

app.notFound((c) => c.json({
  erro: `Rota ${c.req.path} não existe.`,
  dica: 'O MCP atende em POST https://mcp.bncc.dev/mcp (a raiz também funciona). Documentação em https://mcp.bncc.dev/.',
}, 404));

app.onError((e, c) => c.json({
  erro: 'Erro interno do servidor MCP.',
  dica: 'Se persistir, reporte em github.com/bncc-dev/bncc-pacotes/issues.',
}, 500));

export default app;

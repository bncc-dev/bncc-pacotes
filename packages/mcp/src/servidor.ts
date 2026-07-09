#!/usr/bin/env node
/**
 * Servidor MCP da BNCC (stdio) — projeto bncc.dev.
 * Uso: npx @bncc/mcp   (ou: node dist/servidor.js)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { versao } from '@bncc/dados';
import { INSTRUCOES_SERVIDOR, registrarTools } from './tools.js';

const servidor = new McpServer(
  { name: 'bncc', version: '0.0.1' },
  { instructions: `${INSTRUCOES_SERVIDOR}\nVersão dos dados: ${versao().data_version}.` },
);

registrarTools(servidor);

const transporte = new StdioServerTransport();
await servidor.connect(transporte);

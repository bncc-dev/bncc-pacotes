#!/usr/bin/env node
/**
 * Servidor MCP da BNCC (stdio) — projeto bncc.dev.
 * Uso: npx @bncc/mcp   (ou: node dist/servidor.js)
 *
 * As tools (tools.ts) recebem as consultas injetadas; aqui o objeto Consultas
 * é montado com a casca fs do @bncc/dados. O remoto (mcp-worker) monta o mesmo
 * objeto via criarConsultas + JSONs importados.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  buscar, estatisticas, estrutura, habilidadesEF, habilidadesEM,
  objetivosEI, porCodigo, progressaoEI, versao,
} from '@bncc/dados';
import type { Consultas } from '@bncc/dados/nucleo';
import { instrucoesServidor, registrarTools } from './tools.js';

const bncc: Consultas = {
  porCodigo, habilidadesEF, habilidadesEM, objetivosEI,
  buscar, progressaoEI, estrutura, estatisticas,
};
const v = versao();

const servidor = new McpServer(
  // VERSAO_PACOTE é injetada pelo tsup a partir do package.json (tsup.config.ts).
  { name: 'bncc', version: process.env.VERSAO_PACOTE ?? '0.0.0-dev' },
  { instructions: instrucoesServidor(bncc, v.data_version) },
);

registrarTools(servidor, bncc, v);

const transporte = new StdioServerTransport();
await servidor.connect(transporte);

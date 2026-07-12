/**
 * Testes das 7 tools via cliente real do SDK (InMemoryTransport).
 * A correção dos DADOS é coberta pelas consultas douradas do @bncc/dados;
 * aqui se testa roteamento, formato das respostas, limites e erros.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buscar, estatisticas, estrutura, habilidadesEF, habilidadesEM,
  objetivosEI, porCodigo, progressaoEI, versao,
} from '@bncc/dados';
import type { Consultas } from '@bncc/dados/nucleo';
import { instrucoesServidor, registrarTools } from '../src/tools.js';

const bncc: Consultas = {
  porCodigo, habilidadesEF, habilidadesEM, objetivosEI,
  buscar, progressaoEI, estrutura, estatisticas,
};

let cliente: Client;

function conteudo(r: Awaited<ReturnType<Client['callTool']>>): any {
  const c = (r.content as Array<{ type: string; text: string }>)[0];
  return JSON.parse(c.text);
}

beforeAll(async () => {
  const servidor = new McpServer({ name: 'bncc-teste', version: '0.0.1' });
  registrarTools(servidor, bncc, versao());
  const [t1, t2] = InMemoryTransport.createLinkedPair();
  cliente = new Client({ name: 'teste', version: '0.0.1' });
  await Promise.all([servidor.connect(t1), cliente.connect(t2)]);
});

describe('@bncc/mcp', () => {
  it('expõe exatamente as 7 tools', async () => {
    const { tools } = await cliente.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'bncc_buscar', 'bncc_decodificar', 'bncc_estatisticas', 'bncc_estrutura',
      'bncc_listar', 'bncc_lookup', 'bncc_progressao_ei',
    ]);
  });

  it('bncc_lookup devolve registro com fonte', async () => {
    const r = conteudo(await cliente.callTool({ name: 'bncc_lookup', arguments: { codigo: 'ef67lp08' } }));
    expect(r.codigo).toBe('EF67LP08');
    expect(r.fonte.localizador_pdf).toContain('página PDF');
    expect(r.organizacao.nomes.praticaLinguagem).toBe('Leitura');
  });

  it('bncc_lookup com código inexistente retorna isError e mensagem pedagógica', async () => {
    const resp = await cliente.callTool({ name: 'bncc_lookup', arguments: { codigo: 'EF01CI99' } });
    expect(resp.isError).toBe(true);
    expect(conteudo(resp).erro).toMatch(/lacunas/i);
  });

  it('bncc_buscar respeita limite e informa total', async () => {
    const r = conteudo(await cliente.callTool({ name: 'bncc_buscar', arguments: { texto: 'leitura', etapa: 'EF', limite: 5 } }));
    expect(r.exibindo).toBe(5);
    expect(r.total).toBeGreaterThan(5);
    expect(r.resultados).toHaveLength(5);
  });

  it('bncc_listar cobre as três etapas', async () => {
    const ef = conteudo(await cliente.callTool({ name: 'bncc_listar', arguments: { etapa: 'EF', componente: 'MA', ano: 4 } }));
    expect(ef.total).toBe(28);
    const em = conteudo(await cliente.callTool({ name: 'bncc_listar', arguments: { etapa: 'EM', apenas_lp: true } }));
    expect(em.total).toBe(54);
    const ei = conteudo(await cliente.callTool({ name: 'bncc_listar', arguments: { etapa: 'EI', campo: 'TS' } }));
    expect(ei.total).toBe(9);
  });

  it('bncc_decodificar explica código válido mesmo sem existir', async () => {
    const r = conteudo(await cliente.callTool({ name: 'bncc_decodificar', arguments: { codigo: 'EF04MA10' } }));
    expect(r.componenteNome).toBe('Matemática');
  });

  it('bncc_progressao_ei devolve o alinhamento entre faixas', async () => {
    const r = conteudo(await cliente.callTool({ name: 'bncc_progressao_ei', arguments: { codigo: 'EI02TS01' } }));
    expect(r.objetivos.map((o: any) => o.codigo)).toEqual(['EI01TS01', 'EI02TS01', 'EI03TS01']);
  });

  it('bncc_estrutura sem argumento devolve índice com contagens', async () => {
    const r = conteudo(await cliente.callTool({ name: 'bncc_estrutura', arguments: {} }));
    expect(r.competencias_gerais).toBe(10);
    expect(r.competencias_especificas).toBe(105);
  });

  it('bncc_estatisticas inclui a data-version', async () => {
    const r = conteudo(await cliente.callTool({ name: 'bncc_estatisticas', arguments: {} }));
    expect(r.total).toBe(1580);
    expect(r.versao.data_version).toMatch(/^dados-/);
  });

  it('instrucoesServidor traz contagem dinâmica e a versão dos dados', () => {
    const texto = instrucoesServidor(bncc, versao().data_version);
    expect(texto).toContain(estatisticas().total.toLocaleString('pt-BR'));
    expect(texto).toContain(`Versão dos dados: ${versao().data_version}.`);
  });
});

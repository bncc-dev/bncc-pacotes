/** Teste de aceitação do MCP: as 7 tools contra o binário real, com erros e limites. */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const cliente = new Client({ name: 'aceitacao', version: '0.0.1' });
await cliente.connect(new StdioClientTransport({ command: 'node', args: [new URL('../dist/servidor.js', import.meta.url).pathname] }));

const ok = [], falhas = [];
const t = (nome, cond) => (cond ? ok : falhas).push(nome);
const chamar = async (name, args) => {
  const r = await cliente.callTool({ name, arguments: args });
  return { erro: r.isError === true, dados: JSON.parse(r.content[0].text) };
};

const { tools } = await cliente.listTools();
t('7 tools expostas', tools.length === 7);
t('toda tool tem descrição com regra de uso', tools.every((x) => x.description.length > 80));

let r = await chamar('bncc_lookup', { codigo: 'ef67lp08' });
t('lookup case-insensitive + fonte', !r.erro && r.dados.codigo === 'EF67LP08' && /página PDF/.test(r.dados.fonte.localizador_pdf));

r = await chamar('bncc_lookup', { codigo: 'EF01CI99' });
t('lookup inexistente: isError + pedagógico', r.erro && /lacunas/.test(r.dados.erro));

r = await chamar('bncc_buscar', { texto: 'fracoes', componente: 'MA', limite: 3 });
t('buscar: normalização + limite + total', !r.erro && r.dados.total === 6 && r.dados.exibindo === 3);

r = await chamar('bncc_listar', { etapa: 'EF', componente: 'MA', ano: 4 });
t('listar EF', !r.erro && r.dados.total === 28);
r = await chamar('bncc_listar', { etapa: 'EM', area: 'LGG', competencia: 1 });
t('listar EM por competência', !r.erro && r.dados.total === 30);
r = await chamar('bncc_listar', { etapa: 'EI', campo: 'TS', grupo_etario: '02' });
t('listar EI por campo+grupo', !r.erro && r.dados.total === 3);

r = await chamar('bncc_decodificar', { codigo: 'EM13CHS604' });
t('decodificar código válido inexistente', !r.erro && r.dados.competenciaEspecifica === 6);
r = await chamar('bncc_decodificar', { codigo: 'XX99AA01' });
t('decodificar gramática inválida: erro', r.erro && /gramática/.test(r.dados.erro));

r = await chamar('bncc_progressao_ei', { codigo: 'EI01ET05' });
t('progressão EI (campo ET)', !r.erro && r.dados.objetivos.length >= 2);

r = await chamar('bncc_estrutura', {});
t('estrutura sem argumento: índice', !r.erro && r.dados.competencias_especificas === 105);
r = await chamar('bncc_estrutura', { colecao: 'modalidades' });
t('estrutura: coleção EJA', !r.erro && r.dados[0].id === 'eja');

r = await chamar('bncc_estatisticas', {});
t('estatísticas com versão', !r.erro && r.dados.total === 1580 && r.dados.versao.data_version === 'dados-2026.07');

await cliente.close();
console.log(`MCP: ${ok.length} ok, ${falhas.length} falhas`);
falhas.forEach((f) => console.log('  FALHA:', f));
process.exit(falhas.length ? 1 : 0);

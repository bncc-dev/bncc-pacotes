/**
 * Downloads dos pacotes publicados (npm e PyPI), dia a dia.
 *
 * Recorte deliberado: só as fontes públicas. api.npmjs.org e pypistats.org não
 * pedem credencial, então este relatório roda em qualquer lugar, inclusive num
 * clone limpo do repositório por alguém de fora. Para o painel completo — com
 * MCP remoto e API, que exigem credencial — use `scripts/estatisticas.mjs`.
 *
 * Não escreve nada e não grava histórico: imprime e sai.
 *
 * Uso: node scripts/estatisticas-pacotes.mjs [--dias N] [--json]
 */
import {
  PACOTES_NPM,
  PACOTES_PYPI,
  coletarNpm,
  coletarPypi,
  janela,
} from './lib/coleta.mjs';

const args = process.argv.slice(2);
const i = args.indexOf('--dias');
const periodo = janela(i === -1 ? 30 : Number(args[i + 1]));

const resultados = [];
for (const pacote of PACOTES_NPM) {
  try {
    resultados.push(await coletarNpm(pacote, periodo));
  } catch (e) {
    console.error(`aviso: ${pacote} no npm — ${e.message}`);
  }
}
for (const pacote of PACOTES_PYPI) {
  try {
    resultados.push(await coletarPypi(pacote, periodo));
  } catch (e) {
    console.error(`aviso: ${pacote} no PyPI — ${e.message}`);
  }
}

if (!resultados.length) {
  console.error('erro: nenhuma fonte respondeu; verifique a conexão.');
  process.exit(1);
}

if (args.includes('--json')) {
  console.log(JSON.stringify({ periodo, pacotes: resultados }, null, 2));
  process.exit(0);
}

const barra = (n, max, largura = 24) =>
  '█'.repeat(Math.max(n > 0 ? 1 : 0, Math.round((n / (max || 1)) * largura)));

console.log(`\nDownloads de ${periodo.inicio} a ${periodo.fim} (${periodo.dias} dias).`);
console.log('Download é instalação, não uso: um npx ou um build em container');
console.log('baixa de novo a cada execução. Leia como ordem de grandeza.');

for (const r of resultados) {
  console.log(`\n\x1b[1m${r.recurso}\x1b[0m (${r.origem})`);
  const max = Math.max(...r.serie.map((d) => d.downloads), 1);
  for (const d of r.serie) {
    const marca = r.picos.includes(d.dia) ? ' \x1b[33m← pico descartado\x1b[0m' : '';
    console.log(`  ${d.dia}  ${String(d.downloads).padStart(4)}  ${barra(d.downloads, max)}${marca}`);
  }
  console.log(`  ${'─'.repeat(46)}`);
  console.log(`  total no período .......... ${r.total}`);
  if (r.picos.length) {
    console.log(`  total sem picos ........... ${r.totalSemPicos} (${r.picos.length} dia(s) descartado(s))`);
  }
  console.log(`  média/dia (base limpa) .... ${r.mediaDiaria.toFixed(1)}`);
  console.log(`  mediana/dia ............... ${r.mediana}`);
  if (r.comMirror !== undefined) console.log(`  com mirrors (ignorado) .... ${r.comMirror}`);
}
console.log('');

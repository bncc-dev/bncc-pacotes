// Regressão: o build CJS precisa funcionar via require() (consumidores CommonJS).
// Pego em teste de consumidor em 09/07/2026: import.meta.url indefinido no CJS
// sem os shims do tsup.
const { porCodigo, estatisticas, versao } = require('../dist/index.cjs');
const ok = porCodigo('EM13LGG103').competenciasEspecificas[0].numero === 1
  && estatisticas().total === 1721
  && versao().data_version.startsWith('dados-');
if (!ok) { console.error('cjs-smoke: FALHA'); process.exit(1); }
console.log('cjs-smoke: ok');

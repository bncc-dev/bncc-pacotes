/**
 * Verifica o build do site: contagem mínima de páginas e links internos
 * apontando para páginas que existem. Falha com exit 1 se algo quebrar.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const MINIMO_PAGINAS = 1650;

function htmls(dir) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...htmls(caminho));
    else if (nome.endsWith('.html')) saida.push(caminho);
  }
  return saida;
}

const paginas = htmls(DIST);
if (paginas.length < MINIMO_PAGINAS) {
  console.error(`ERRO: ${paginas.length} páginas geradas (mínimo esperado: ${MINIMO_PAGINAS})`);
  process.exit(1);
}

const quebrados = new Set();
const cache = new Map();
const existe = (rota) => {
  if (!cache.has(rota)) {
    const limpo = rota.replace(/[#?].*$/, '');
    cache.set(rota, existsSync(join(DIST, limpo, 'index.html')) || existsSync(join(DIST, limpo)));
  }
  return cache.get(rota);
};

for (const pagina of paginas) {
  const html = readFileSync(pagina, 'utf8');
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    if (!existe(href)) quebrados.add(`${href} (em ${pagina.slice(DIST.length)})`);
  }
}

if (quebrados.size) {
  console.error(`ERRO: ${quebrados.size} links internos quebrados:`);
  for (const q of [...quebrados].slice(0, 20)) console.error('  -', q);
  process.exit(1);
}

console.log(`links ok: ${paginas.length} páginas, zero links internos quebrados`);

// Gera o SVG pixel-art da maçã do topo (grade 12x13, 1 rect por pixel).
// Uso: node scripts/gerar-maca.mjs > public/maca.svg
const CORES = {
  X: '#8b5a2b', // cabinho
  G: '#2ea043', // folha (verde da marca)
  R: '#e5484d', // corpo
  W: '#ffffff', // brilho
};

const MAPA = [
  '.......X....',
  '...GG.X.....',
  '..GGGGX.....',
  '..RRRR.RRR..',
  '.RRRRRRRRRR.',
  '.RWWRRRRRRR.',
  'RRWRRRRRRRRR',
  'RRRRRRRRRRRR',
  'RRRRRRRRRRRR',
  '.RRRRRRRRRR.',
  '.RRRRRRRRRR.',
  '..RRRRRRRR..',
  '...RRR.RRR..',
];

const rects = [];
MAPA.forEach((linha, y) => {
  [...linha].forEach((c, x) => {
    if (c !== '.') rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${CORES[c]}"/>`);
  });
});

console.log(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 13" shape-rendering="crispEdges">
${rects.join('\n')}
</svg>`);

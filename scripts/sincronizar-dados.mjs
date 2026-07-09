/**
 * Sincroniza os dados do bncc-dados para dentro dos pacotes.
 *
 * O pacote nunca aponta para dado "flutuante": este script copia os JSONs de
 * um checkout local do bncc-dados, registra o commit, a data-version e os
 * checksums em dados/VERSAO.json, e falha se o checkout estiver sujo.
 *
 * Uso: node scripts/sincronizar-dados.mjs [caminho-do-bncc-dados]
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ORIGEM = resolve(process.argv[2] ?? '../bncc-dados');
const DESTINOS = ['packages/bncc/dados', 'python/bncc/dados'];
const ARQUIVOS = ['estrutura.json', 'educacao-infantil.json', 'ensino-fundamental.json', 'ensino-medio.json'];

const git = (cmd) => execSync(`git -C ${ORIGEM} ${cmd}`, { encoding: 'utf8' }).trim();

const sujo = git('status --porcelain');
if (sujo) {
  console.error(`erro: o checkout de ${ORIGEM} tem mudanças não commitadas; sincronize a partir de estado limpo.`);
  process.exit(1);
}
const commit = git('rev-parse HEAD');

const dadosDir = join(ORIGEM, 'dados', 'bncc-2018');
const checksums = {};
for (const arq of ARQUIVOS) {
  const conteudo = readFileSync(join(dadosDir, arq));
  checksums[arq] = createHash('sha256').update(conteudo).digest('hex');
}
const ef = JSON.parse(readFileSync(join(dadosDir, 'ensino-fundamental.json'), 'utf8'));
const dataVersion = ef.habilidades[0].vigencia.desde;

const versao = {
  data_version: dataVersion,
  origem: 'github.com/bncc-dev/bncc-dados',
  commit,
  sincronizado_de: ORIGEM,
  checksums_sha256: checksums,
};

for (const destino of DESTINOS) {
  mkdirSync(destino, { recursive: true });
  for (const arq of ARQUIVOS) copyFileSync(join(dadosDir, arq), join(destino, arq));
  writeFileSync(join(destino, 'VERSAO.json'), JSON.stringify(versao, null, 2) + '\n');
}

console.log(`dados sincronizados: ${dataVersion} @ ${commit.slice(0, 10)} → ${DESTINOS.join(', ')}`);

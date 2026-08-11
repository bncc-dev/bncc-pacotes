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
import { basename, join, resolve } from 'node:path';

const ORIGEM = resolve(process.argv[2] ?? '../bncc-dados');
const DESTINOS = ['packages/bncc/dados', 'python/bncc/dados'];
// [origem relativa a dados/, nome no pacote]
const ARQUIVOS = [
  ['bncc-2018/estrutura.json', 'estrutura.json'],
  ['bncc-2018/educacao-infantil.json', 'educacao-infantil.json'],
  ['bncc-2018/ensino-fundamental.json', 'ensino-fundamental.json'],
  ['bncc-2018/ensino-medio.json', 'ensino-medio.json'],
  ['bncc-2018/marcos-legais.json', 'marcos-legais.json'],
  ['bncc-2018/perfis.json', 'perfis.json'],
  ['computacao-2022/computacao.json', 'computacao.json'],
];

const git = (cmd) => execSync(`git -C ${ORIGEM} ${cmd}`, { encoding: 'utf8' }).trim();

const sujo = git('status --porcelain');
if (sujo) {
  console.error(`erro: o checkout de ${ORIGEM} tem mudanças não commitadas; sincronize a partir de estado limpo.`);
  process.exit(1);
}
const commit = git('rev-parse HEAD');

const dadosDir = join(ORIGEM, 'dados');
const checksums = {};
for (const [origem, nome] of ARQUIVOS) {
  const conteudo = readFileSync(join(dadosDir, origem));
  checksums[nome] = createHash('sha256').update(conteudo).digest('hex');
}
// A data-version preferida é a tag exata do commit sincronizado (cobre patches
// como dados-2026.07.1, em que a vigência dos registros não muda). Sem tag
// exata, cai no `vigencia.desde` do primeiro registro.
let dataVersion;
try {
  dataVersion = git('describe --tags --exact-match --match "dados-*"');
} catch {
  const ef = JSON.parse(readFileSync(join(dadosDir, 'bncc-2018', 'ensino-fundamental.json'), 'utf8'));
  dataVersion = ef.habilidades[0].vigencia.desde;
}

const versao = {
  data_version: dataVersion,
  origem: 'github.com/bncc-dev/bncc-dados',
  commit,
  // Só o nome do diretório de origem, nunca o caminho absoluto: este arquivo
  // viaja dentro do tarball do npm e do wheel do PyPI, e o caminho absoluto
  // expõe o diretório pessoal de quem sincronizou. O `commit` acima é o que
  // identifica a origem de forma reprodutível.
  sincronizado_de: basename(ORIGEM),
  checksums_sha256: checksums,
};

for (const destino of DESTINOS) {
  mkdirSync(destino, { recursive: true });
  for (const [origem, nome] of ARQUIVOS) copyFileSync(join(dadosDir, origem), join(destino, nome));
  writeFileSync(join(destino, 'VERSAO.json'), JSON.stringify(versao, null, 2) + '\n');
}

console.log(`dados sincronizados: ${dataVersion} @ ${commit.slice(0, 10)} → ${DESTINOS.join(', ')}`);

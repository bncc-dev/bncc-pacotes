/**
 * bncc — a BNCC como dados estruturados, com API de consulta em português.
 *
 * M0: carregamento dos dados embutidos e metadados de versão.
 * A API de consulta (porCodigo, buscar, habilidadesEF...) chega no M1.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DADOS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'dados');

function carregar<T>(arquivo: string): T {
  return JSON.parse(readFileSync(join(DADOS_DIR, arquivo), 'utf8')) as T;
}

export interface Versao {
  data_version: string;
  origem: string;
  commit: string;
  checksums_sha256: Record<string, string>;
}

/** Metadados da versão dos dados embutidos (data-version, commit de origem, checksums). */
export function versao(): Versao {
  return carregar<Versao>('VERSAO.json');
}

/** Acesso bruto aos arquivos de dados embutidos (API tipada de consulta chega no M1). */
export function dadosBrutos(arquivo: 'estrutura' | 'educacao-infantil' | 'ensino-fundamental' | 'ensino-medio'): unknown {
  return carregar(`${arquivo}.json`);
}

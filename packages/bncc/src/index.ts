/**
 * @bncc/dados — a BNCC como dados estruturados e verificados, com API de
 * consulta em português. Dados embutidos, zero dependências, zero rede.
 *
 * Projeto bncc.dev · dados CC BY 4.0 · código MIT
 */
export { decodificar, CAMPOS_EI, GRUPOS_EI, COMPONENTES_EF, BLOCOS_EF, AREAS_EM } from './decodificar.js';
export type { CodigoDecodificado, CodigoEI, CodigoEF, CodigoEM } from './decodificar.js';
export {
  porCodigo, buscar, habilidadesEF, habilidadesEM, objetivosEI,
  estrutura, progressaoEI, estatisticas,
} from './consultas.js';
export type { FiltroEF, FiltroEM, FiltroEI, FiltroBusca } from './consultas.js';
export type * from './tipos.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export interface Versao {
  data_version: string;
  origem: string;
  commit: string;
  checksums_sha256: Record<string, string>;
}

/** Metadados da versão dos dados embutidos (data-version, commit de origem, checksums). */
export function versao(): Versao {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dados');
  return JSON.parse(readFileSync(join(dir, 'VERSAO.json'), 'utf8')) as Versao;
}

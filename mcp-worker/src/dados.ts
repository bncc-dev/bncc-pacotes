/**
 * Única porta de entrada dos dados: consome o núcleo injetável do @bncc/dados
 * (o worker não reimplementa nenhuma consulta, mesmo princípio da bncc-api).
 *
 * Os JSONs entram como módulos (o Workers não tem sistema de arquivos);
 * o cast é necessário porque o TypeScript infere tipos literais largos para
 * JSON importado, mas os arquivos são exatamente os que o pacote valida.
 */
import { criarConsultas, type DadosBNCC } from '@bncc/dados/nucleo';
import type { Versao } from '@bncc/dados';
import estrutura from '@bncc/dados/dados/estrutura.json';
import educacaoInfantil from '@bncc/dados/dados/educacao-infantil.json';
import ensinoFundamental from '@bncc/dados/dados/ensino-fundamental.json';
import ensinoMedio from '@bncc/dados/dados/ensino-medio.json';
import VERSAO from '@bncc/dados/dados/VERSAO.json';

export const bncc = criarConsultas({
  estrutura,
  educacaoInfantil,
  ensinoFundamental,
  ensinoMedio,
} as unknown as DadosBNCC);

export const versaoDados = VERSAO as unknown as Versao;

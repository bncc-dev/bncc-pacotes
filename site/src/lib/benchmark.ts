/**
 * Camada do site para o benchmark de alucinação (bncc-dev/bncc-benchmark).
 * Lê o JSON vendorizado em src/dados/benchmark/ (proveniência ao lado);
 * releases futuras entram como novos arquivos versionados.
 */
import bruto from '../dados/benchmark/leaderboard-v0.1.0.json';

export interface ExemploCurado {
  rotulo: 'invencao' | 'abstencao' | 'confusao';
  pergunta: string;
  resposta: string;
  explicacao: string;
}

export interface ModeloBenchmark {
  id: string;
  posicao: number;
  nome: string;
  empresa: string;
  tier: string;
  nota: number;
  b_reais: number;
  invencao_pura: number;
  confusao_derivado: number;
  a_fiel: number;
  a_aluc: number;
  a_abstencao: number;
  d_ok: number;
  c_inventados: number;
  c_texto_ok: number;
  c_citados: number;
  cortados: number;
  custo_usd: number;
  exemplos: ExemploCurado[];
}

export interface AmostraCrua {
  item_id: string;
  parafrase: number;
  modelo: string;
  nome_modelo: string;
  tarefa: string;
  pergunta: string;
  resposta: string;
  veredito: string;
  ok: boolean;
}

export interface RecorteLinha {
  rotulo: string;
  taxa: number;
}

export interface Benchmark {
  meta: {
    rodada: string;
    versao: string;
    itens_versao: string;
    total_itens: number;
    dataset_versao: string;
    avaliador_versao: string;
    total_respostas: number;
    total_modelos: number;
    abstencoes_a: number;
    medido_em: string;
    custo_total_usd: number;
  };
  modelos: ModeloBenchmark[];
  recortes: { por_etapa: RecorteLinha[]; por_modulo: RecorteLinha[] };
  amostras: AmostraCrua[];
}

export const BENCHMARK = bruto as Benchmark;

/** 0,813 → "81,3" (nota composta 0-100 já vem multiplicada). */
export const nota = (n: number): string => n.toFixed(1).replace('.', ',');

/** 0.1234 → "12%" (taxas 0-1). */
export const pct = (t: number): string => `${Math.round(t * 100)}%`;

/** Taxa 0-1 com uma casa, para taxas pequenas: 0.032 → "3,2%". */
export const pct1 = (t: number): string => `${(t * 100).toFixed(1).replace('.', ',')}%`;

/** 11.132 → "11,13" (US$). */
export const usd = (v: number): string => v.toFixed(2).replace('.', ',');

/** Data ISO → "16/jul/2026". */
export function dataCurta(iso: string): string {
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [ano, mes, dia] = iso.split('-').map(Number);
  return `${dia}/${meses[mes - 1]}/${ano}`;
}

export const NOME_TAREFA: Record<string, string> = {
  A: 'transcrição',
  B: 'existência',
  C: 'geração aberta',
  D: 'lookup inverso',
};

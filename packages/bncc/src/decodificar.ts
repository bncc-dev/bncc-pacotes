/**
 * Decodificador de códigos da BNCC. Port fiel de pipeline/codigos.py do
 * bncc-dados (mesmas gramáticas, mesmos casos de erro).
 */

export const CAMPOS_EI: Record<string, string> = {
  EO: 'O eu, o outro e o nós',
  CG: 'Corpo, gestos e movimentos',
  TS: 'Traços, sons, cores e formas',
  EF: 'Escuta, fala, pensamento e imaginação',
  ET: 'Espaços, tempos, quantidades, relações e transformações',
};

export const GRUPOS_EI: Record<string, string> = {
  '01': 'Bebês (0–1a6m)',
  '02': 'Crianças bem pequenas (1a7m–3a11m)',
  '03': 'Crianças pequenas (4a–5a11m)',
};

export const COMPONENTES_EF: Record<string, string> = {
  AR: 'Arte', CI: 'Ciências', EF: 'Educação Física', ER: 'Ensino Religioso',
  GE: 'Geografia', HI: 'História', LI: 'Língua Inglesa', LP: 'Língua Portuguesa', MA: 'Matemática',
};

export const BLOCOS_EF: Record<string, number[]> = {
  '15': [1, 2, 3, 4, 5], '69': [6, 7, 8, 9], '12': [1, 2], '35': [3, 4, 5], '67': [6, 7], '89': [8, 9],
};

const BLOCOS_VALIDOS_POR_COMPONENTE: Record<string, Set<string>> = {
  AR: new Set(['15', '69']),
  LP: new Set(['15', '69', '12', '35', '67', '89']),
  EF: new Set(['12', '35', '67', '89']),
};

export const AREAS_EM: Record<string, string> = {
  LGG: 'Linguagens e suas Tecnologias',
  MAT: 'Matemática e suas Tecnologias',
  CNT: 'Ciências da Natureza e suas Tecnologias',
  CHS: 'Ciências Humanas e Sociais Aplicadas',
};

export interface CodigoEI {
  codigo: string;
  etapa: 'EI';
  grupoEtario: string;
  grupoEtarioNome: string;
  campoExperiencias: string;
  campoExperienciasNome: string;
  sequencia: number;
}

export interface CodigoEF {
  codigo: string;
  etapa: 'EF';
  anos: number[];
  bloco: boolean;
  componente: string;
  componenteNome: string;
  sequencia: number;
}

export interface CodigoEM {
  codigo: string;
  etapa: 'EM';
  seriacao: null;
  area: string;
  areaNome: string;
  componente?: 'LP';
  competenciaEspecifica: number | null;
  sequencia: number;
}

export type CodigoDecodificado = CodigoEI | CodigoEF | CodigoEM;

/**
 * Decodifica um código BNCC (case-insensitive) para sua estrutura.
 * Lança Error com mensagem explicativa para códigos inválidos.
 */
export function decodificar(codigoBruto: string): CodigoDecodificado {
  const codigo = codigoBruto.trim().toUpperCase();

  let m = codigo.match(/^EI(0[123])(EO|CG|TS|EF|ET)(\d{2})$/);
  if (m) {
    const [, grupo, campo, seq] = m;
    return {
      codigo, etapa: 'EI',
      grupoEtario: grupo, grupoEtarioNome: GRUPOS_EI[grupo],
      campoExperiencias: campo, campoExperienciasNome: CAMPOS_EI[campo],
      sequencia: Number(seq),
    };
  }

  m = codigo.match(/^EF(\d{2})([A-Z]{2})(\d{2})$/);
  if (m) {
    const [, anosStr, comp, seq] = m;
    if (!(comp in COMPONENTES_EF)) throw new Error(`${codigo}: componente '${comp}' desconhecido`);
    let anos: number[];
    if (anosStr in BLOCOS_EF) {
      if (!BLOCOS_VALIDOS_POR_COMPONENTE[comp]?.has(anosStr)) {
        throw new Error(`${codigo}: bloco '${anosStr}' inválido para ${COMPONENTES_EF[comp]}`);
      }
      anos = BLOCOS_EF[anosStr];
    } else if (anosStr.startsWith('0') && Number(anosStr) >= 1 && Number(anosStr) <= 9) {
      anos = [Number(anosStr)];
    } else {
      throw new Error(`${codigo}: ano/bloco '${anosStr}' inválido`);
    }
    return {
      codigo, etapa: 'EF', anos, bloco: anosStr in BLOCOS_EF,
      componente: comp, componenteNome: COMPONENTES_EF[comp], sequencia: Number(seq),
    };
  }

  m = codigo.match(/^EM13([A-Z]{3})(\d)(\d{2})$/);
  if (m && m[1] in AREAS_EM) {
    const [, area, ce, seq] = m;
    return {
      codigo, etapa: 'EM', seriacao: null, area, areaNome: AREAS_EM[area],
      competenciaEspecifica: Number(ce), sequencia: Number(seq),
    };
  }

  m = codigo.match(/^EM13LP(\d{2})$/);
  if (m) {
    return {
      codigo, etapa: 'EM', seriacao: null, area: 'LGG', areaNome: AREAS_EM.LGG,
      componente: 'LP', competenciaEspecifica: null, sequencia: Number(m[1]),
    };
  }

  throw new Error(`${codigo}: não corresponde a nenhuma gramática BNCC (EI/EF/EM)`);
}

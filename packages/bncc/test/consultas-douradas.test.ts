/**
 * Executa as consultas douradas compartilhadas (fixtures/) — o mesmo arquivo
 * que o pacote PyPI executa, provando a paridade entre as implementações.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buscar, decodificar, estatisticas, habilidadesEF, habilidadesEM,
  objetivosEI, porCodigo, progressaoEI,
} from '../src/index.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'fixtures', 'consultas-douradas.json');
const { casos } = JSON.parse(readFileSync(FIXTURES, 'utf8'));

describe('consultas douradas (paridade npm/PyPI)', () => {
  for (const caso of casos) {
    it(caso.id, () => {
      switch (caso.operacao) {
        case 'decodificar': {
          const d = decodificar(caso.args) as unknown as Record<string, unknown>;
          for (const [k, v] of Object.entries(caso.esperado)) expect(d[k], k).toEqual(v);
          break;
        }
        case 'decodificar_erro':
          expect(() => decodificar(caso.args)).toThrowError(new RegExp(caso.esperado, 'i'));
          break;
        case 'porCodigo': {
          const r = porCodigo(caso.args);
          const e = caso.esperado;
          if (e.etapa) expect(r.etapa).toBe(e.etapa);
          if (e.anos) expect(r.anos).toEqual(e.anos);
          if (e.praticaLinguagem) expect(r.organizacao?.nomes.praticaLinguagem).toBe(e.praticaLinguagem);
          if (e.temLocalizadorPdf) expect(r.fonte.localizador_pdf).toBeTruthy();
          if (e.competenciasNumeros) expect(r.competenciasEspecificas?.map((c) => c.numero)).toEqual(e.competenciasNumeros);
          break;
        }
        case 'porCodigo_erro':
          expect(() => porCodigo(caso.args)).toThrowError(new RegExp(caso.esperado, 'i'));
          break;
        case 'contar_habilidadesEF':
          expect(habilidadesEF(caso.args)).toHaveLength(caso.esperado);
          break;
        case 'contar_uniao_anos_ef': {
          const uniao = new Set<string>();
          for (const ano of caso.args.anos) {
            for (const h of habilidadesEF({ componente: caso.args.componente, ano })) uniao.add(h.codigo);
          }
          expect(uniao.size).toBe(caso.esperado);
          break;
        }
        case 'contar_habilidadesEM':
          expect(habilidadesEM(caso.args)).toHaveLength(caso.esperado);
          break;
        case 'contar_objetivosEI':
          expect(objetivosEI(caso.args)).toHaveLength(caso.esperado);
          break;
        case 'contar_buscar': {
          const { texto, ...filtro } = caso.args;
          expect(buscar(texto, filtro)).toHaveLength(caso.esperado);
          break;
        }
        case 'progressaoEI_codigos':
          expect(progressaoEI(caso.args).objetivos.map((o) => o.codigo)).toEqual(caso.esperado);
          break;
        case 'estatisticas':
          expect(estatisticas()).toEqual(caso.esperado);
          break;
        default:
          throw new Error(`operação desconhecida na fixture: ${caso.operacao}`);
      }
    });
  }
});

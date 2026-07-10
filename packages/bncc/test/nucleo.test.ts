/**
 * Prova do núcleo injetável: os mesmos resultados da API padrão (fs) devem
 * sair de criarConsultas() alimentado com os JSONs como objetos, sem que o
 * núcleo toque no sistema de arquivos (é o caminho de runtimes como Workers).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { criarConsultas, type DadosBNCC } from '../src/nucleo.js';
import { porCodigo, estatisticas } from '../src/index.js';

const DADOS = join(dirname(fileURLToPath(import.meta.url)), '..', 'dados');
const carregar = (a: string) => JSON.parse(readFileSync(join(DADOS, a), 'utf8'));

const dados: DadosBNCC = {
  estrutura: carregar('estrutura.json'),
  educacaoInfantil: carregar('educacao-infantil.json'),
  ensinoFundamental: carregar('ensino-fundamental.json'),
  ensinoMedio: carregar('ensino-medio.json'),
};
const c = criarConsultas(dados);

describe('núcleo injetável (criarConsultas)', () => {
  it('não importa node:fs nem node:path (compatível com Workers)', () => {
    const fonte = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'nucleo.ts'), 'utf8');
    expect(fonte).not.toMatch(/node:(fs|path|url)/);
  });

  it('devolve exatamente o mesmo registro que a API padrão', () => {
    expect(c.porCodigo('EF67LP08')).toEqual(porCodigo('EF67LP08'));
    expect(c.porCodigo('EI02TS01')).toEqual(porCodigo('EI02TS01'));
    expect(c.porCodigo('EM13LGG103')).toEqual(porCodigo('EM13LGG103'));
  });

  it('mantém as contagens do dataset', () => {
    expect(c.estatisticas()).toEqual(estatisticas());
    expect(c.estatisticas().total).toBe(1580);
  });

  it('busca, filtros e progressão funcionam pelo núcleo', () => {
    expect(c.buscar('fake news').length).toBeGreaterThan(0);
    expect(c.habilidadesEF({ componente: 'LP', ano: 6 }).length).toBeGreaterThan(0);
    expect(c.progressaoEI('EI02TS01').objetivos).toHaveLength(3);
    expect(() => c.porCodigo('EF67LP99')).toThrow(/lacunas legítimas/);
  });
});

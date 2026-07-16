/**
 * Prova do núcleo injetável: os mesmos resultados da API padrão (fs) devem
 * sair de criarConsultas() alimentado com os JSONs como objetos, sem que o
 * núcleo toque no sistema de arquivos (é o caminho de runtimes como Workers).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { criarConsultas, decodificar, type DadosBNCC } from '../src/nucleo.js';
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

describe('complemento de Computação injetado (computacao-2022)', () => {
  const cCO = criarConsultas({ ...dados, computacao: carregar('computacao.json') });

  it('soma as 141 aprendizagens CO às contagens', () => {
    expect(cCO.estatisticas().total).toBe(1721);
    expect((cCO.estatisticas() as { computacao?: number }).computacao).toBe(141);
  });

  it('resolve registros CO das três etapas com eixo e contexto', () => {
    const ef = cCO.porCodigo('EF03CO05');
    expect(ef.documento).toBe('computacao-2022');
    expect(ef.componente?.nome).toBe('Computação');
    expect(ef.eixo?.nome).toBeTruthy();
    expect(ef.texto.length).toBeGreaterThan(20);

    const ei = cCO.porCodigo('EI03CO01');
    expect(ei.etapa).toBe('EI');
    expect(ei.eixo?.nome).toBe('Pensamento Computacional');
    expect(ei.grupoEtario).toBe('ei-grupo-03');

    const em = cCO.porCodigo('EM13CO01');
    expect(em.etapa).toBe('EM');
    expect(em.competenciaComputacao?.numero).toBeGreaterThan(0);
    expect(em.competenciaComputacao?.texto.length).toBeGreaterThan(10);
  });

  it('inclui CO na busca textual (com e sem filtro de etapa)', () => {
    const achados = cCO.buscar('algoritmo');
    expect(achados.some((r) => r.documento === 'computacao-2022')).toBe(true);
    const soEF = cCO.buscar('algoritmo', { etapa: 'EF' });
    expect(soEF.every((r) => r.etapa === 'EF')).toBe(true);
  });

  it('progressão por alinhamento não existe para objetivos CO', () => {
    expect(() => cCO.progressaoEI('EI03CO01')).toThrow(/complemento de Computação/);
  });

  it('decodifica as três gramáticas CO (por ano, por bloco, EI e EM)', () => {
    expect(decodificar('EF03CO05')).toMatchObject({ etapa: 'EF', documento: 'computacao-2022', anos: [3], componente: 'CO' });
    expect(decodificar('EF15CO01')).toMatchObject({ etapa: 'EF', anos: [1, 2, 3, 4, 5], bloco: true });
    expect(decodificar('EF69CO10')).toMatchObject({ etapa: 'EF', anos: [6, 7, 8, 9], bloco: true });
    expect(decodificar('EI03CO09')).toMatchObject({ etapa: 'EI', documento: 'computacao-2022', campoExperiencias: 'CO' });
    expect(decodificar('EM13CO26')).toMatchObject({ etapa: 'EM', documento: 'computacao-2022', sequencia: 26 });
    expect(() => decodificar('EF00CO01')).toThrow(/inválido/);
    expect(() => decodificar('EF12CO01')).toThrow(/bloco '12' inválido/);
  });

  it('sem o módulo injetado, nada muda (npm atual)', () => {
    expect(c.estatisticas().total).toBe(1580);
    expect((c.estatisticas() as { computacao?: number }).computacao).toBeUndefined();
    expect(() => c.porCodigo('EF03CO05')).toThrow(/não existe/);
  });
});

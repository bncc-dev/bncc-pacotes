import { describe, expect, it } from 'vitest';
import { dadosBrutos, versao } from '../src/index.js';

describe('M0: dados embutidos', () => {
  it('versão registra data-version, commit e checksums', () => {
    const v = versao();
    expect(v.data_version).toMatch(/^dados-\d{4}\.\d{2}/);
    expect(v.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(Object.keys(v.checksums_sha256)).toHaveLength(4);
  });

  it('as 1.580 aprendizagens estão embutidas', () => {
    const ef = dadosBrutos('ensino-fundamental') as { habilidades: unknown[] };
    const em = dadosBrutos('ensino-medio') as { habilidades: unknown[] };
    const ei = dadosBrutos('educacao-infantil') as { objetivos: unknown[] };
    expect(ef.habilidades.length + em.habilidades.length + ei.objetivos.length).toBe(1580);
  });
});

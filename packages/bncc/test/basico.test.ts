import { describe, expect, it } from 'vitest';
import { porCodigo, versao } from '../src/index.js';

describe('básico', () => {
  it('versão registra data-version, commit e checksums', () => {
    const v = versao();
    expect(v.data_version).toMatch(/^dados-\d{4}\.\d{2}/);
    expect(v.commit).toMatch(/^[0-9a-f]{40}$/);
    // O dataset pode ganhar arquivos (marcos legais, perfis, computação);
    // o que o pacote garante é o núcleo das três etapas + estrutura.
    expect(Object.keys(v.checksums_sha256)).toEqual(expect.arrayContaining([
      'estrutura.json', 'educacao-infantil.json', 'ensino-fundamental.json', 'ensino-medio.json',
    ]));
  });

  it('porCodigo é case-insensitive e resolve nomes', () => {
    const h = porCodigo('ef67lp08');
    expect(h.codigo).toBe('EF67LP08');
    expect(h.componente?.nome).toBe('Língua Portuguesa');
    expect(h.objetosConhecimento?.[0].nome).toBeTruthy();
  });

  it('EI resolve campo de experiências por nome', () => {
    const o = porCodigo('EI02TS01');
    expect(o.campoExperiencias?.nome).toBe('Traços, sons, cores e formas');
  });
});

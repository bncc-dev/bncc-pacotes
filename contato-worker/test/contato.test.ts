import { describe, expect, it } from 'vitest';
import { ASSUNTOS, eRobo, LIMITES, validar } from '../src/validacao';
import { montarEmail } from '../src/email';

const valido = {
  nome: 'Maria da Silva',
  email: 'maria@escola.br',
  assunto: 'parceria',
  mensagem: 'Olá, equipe! Gostaria de conversar sobre uso institucional.',
};

describe('validar', () => {
  it('aceita payload completo e devolve os dados limpos', () => {
    const r = validar(valido);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados).toEqual(valido);
  });

  it('apara espaços nas pontas', () => {
    const r = validar({ ...valido, nome: '  Maria da Silva  ' });
    if (r.ok) expect(r.dados.nome).toBe('Maria da Silva');
    expect(r.ok).toBe(true);
  });

  it('rejeita corpo que não é objeto', () => {
    for (const bruto of [null, 'texto', 42, []]) {
      const r = validar(bruto);
      if (Array.isArray(bruto)) continue; // array é objeto; cai na falta de campos
      expect(r.ok).toBe(false);
    }
  });

  it('exige nome, e-mail e mensagem', () => {
    for (const campo of ['nome', 'email', 'mensagem'] as const) {
      const r = validar({ ...valido, [campo]: '' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toContain('Preencha');
    }
  });

  it('rejeita e-mail sem formato válido', () => {
    for (const email of ['maria', 'maria@', 'maria@escola', 'ma ria@escola.br']) {
      const r = validar({ ...valido, email });
      expect(r.ok).toBe(false);
    }
  });

  it('rejeita campos acima do limite', () => {
    const r = validar({ ...valido, mensagem: 'x'.repeat(LIMITES.mensagem + 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain('tamanho');
  });

  it('assunto desconhecido ou ausente vira "outro"', () => {
    for (const assunto of [undefined, 'hacker', '']) {
      const r = validar({ ...valido, assunto });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.dados.assunto).toBe('outro');
    }
  });
});

describe('eRobo (honeypot)', () => {
  it('detecta o campo escondido preenchido', () => {
    expect(eRobo({ ...valido, site: 'https://spam.example' })).toBe(true);
  });
  it('não acusa humanos (campo vazio ou ausente)', () => {
    expect(eRobo(valido)).toBe(false);
    expect(eRobo({ ...valido, site: '' })).toBe(false);
    expect(eRobo(null)).toBe(false);
  });
});

describe('montarEmail', () => {
  const dados = { nome: 'Maria', email: 'maria@escola.br', assunto: 'imprensa', mensagem: 'Quero entrevistar a equipe.' } as const;

  it('prefixa o assunto com [bncc.dev · {assunto}]', () => {
    const { assunto } = montarEmail(dados, 'formulario@bncc.dev', 'equipe@example.com');
    expect(assunto).toBe(`[bncc.dev · ${ASSUNTOS.imprensa}] mensagem de Maria`);
  });

  it('gera MIME com remetente, destino, Reply-To de quem escreveu e a mensagem', () => {
    const { raw } = montarEmail(dados, 'formulario@bncc.dev', 'equipe@example.com');
    expect(raw).toContain('formulario@bncc.dev');
    expect(raw).toContain('equipe@example.com');
    expect(raw).toContain('Reply-To: <maria@escola.br>');
    expect(raw).toContain('Quero entrevistar a equipe.');
  });
});

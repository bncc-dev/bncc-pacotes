/**
 * Validação do payload do formulário: funções puras, testáveis sem Workers.
 * O tom das mensagens de erro segue o da bncc-api ({erro, dica}).
 */

export const ASSUNTOS: Record<string, string> = {
  duvida: 'Dúvida',
  parceria: 'Parceria',
  imprensa: 'Imprensa',
  outro: 'Outro',
};

export const LIMITES = { nome: 120, email: 200, mensagem: 4000 } as const;

export interface Mensagem {
  nome: string;
  email: string;
  assunto: keyof typeof ASSUNTOS;
  mensagem: string;
}

export type Validacao =
  | { ok: true; dados: Mensagem }
  | { ok: false; erro: string; dica: string };

const DICA_CAMPOS = 'Envie JSON com nome, email e mensagem (e opcionalmente assunto). Se o formulário do site falhar, escreva para contato@bncc.dev.';

// Formato básico: algo@algo.algo, sem espaços. Filtra erro de digitação, não valida entregabilidade.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Honeypot: robôs preenchem o campo escondido "site"; humanos nunca o veem. */
export function eRobo(bruto: unknown): boolean {
  if (typeof bruto !== 'object' || bruto === null) return false;
  return texto((bruto as Record<string, unknown>).site) !== '';
}

export function validar(bruto: unknown): Validacao {
  if (typeof bruto !== 'object' || bruto === null) {
    return { ok: false, erro: 'Corpo da requisição inválido.', dica: DICA_CAMPOS };
  }
  const b = bruto as Record<string, unknown>;
  const nome = texto(b.nome);
  const email = texto(b.email);
  const mensagem = texto(b.mensagem);

  if (!nome || !email || !mensagem) {
    return { ok: false, erro: 'Preencha nome, e-mail e mensagem.', dica: DICA_CAMPOS };
  }
  if (nome.length > LIMITES.nome || email.length > LIMITES.email || mensagem.length > LIMITES.mensagem) {
    return {
      ok: false,
      erro: 'Algum campo passou do tamanho máximo.',
      dica: `Limites: nome ${LIMITES.nome}, e-mail ${LIMITES.email}, mensagem ${LIMITES.mensagem} caracteres.`,
    };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, erro: 'O e-mail informado não parece válido.', dica: 'Confira o endereço: é por ele que a equipe responde.' };
  }

  const assuntoBruto = texto(b.assunto);
  const assunto = (assuntoBruto in ASSUNTOS ? assuntoBruto : 'outro') as keyof typeof ASSUNTOS;

  return { ok: true, dados: { nome, email, assunto, mensagem } };
}

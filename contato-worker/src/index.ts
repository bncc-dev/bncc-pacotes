/**
 * Worker do formulário de contato do bncc.dev.
 * Fluxo: CORS → honeypot → rate limit → validação → Turnstile → envio (Email Routing).
 * Falha de qualquer etapa responde {erro, dica} apontando o fallback contato@bncc.dev.
 */
import { EmailMessage } from 'cloudflare:email';
import { eRobo, validar } from './validacao';
import { montarEmail } from './email';

interface LimitadorPorIP {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  CORREIO: SendEmail;
  DESTINO: string;
  REMETENTE: string;
  LIMITADOR?: LimitadorPorIP;
  TURNSTILE_SECRET?: string;
}

// Origens que podem chamar o Worker do browser (o site em produção e o dev do Astro).
const ORIGENS = ['https://bncc.dev', 'http://localhost:4321'];
const DICA_FALLBACK = 'Se o formulário continuar falhando, escreva direto para contato@bncc.dev: é o mesmo destino.';

function cors(req: Request): Record<string, string> {
  const origem = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENS.includes(origem) ? origem : ORIGENS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(status: number, corpo: unknown, cabecalhos: Record<string, string>): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cabecalhos },
  });
}

async function turnstileOk(token: string, secret: string, ip: string | null): Promise<boolean> {
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);
  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!resp.ok) return false;
  const r = (await resp.json()) as { success?: boolean };
  return r.success === true;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cab = cors(req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cab });
    if (req.method !== 'POST') {
      return json(405, { erro: 'Este endpoint só aceita POST.', dica: 'Ele existe para o formulário de bncc.dev/contato/.' }, cab);
    }

    let bruto: unknown;
    try {
      bruto = await req.json();
    } catch {
      return json(400, { erro: 'Corpo da requisição não é JSON válido.', dica: DICA_FALLBACK }, cab);
    }

    // Honeypot preenchido: responde sucesso e descarta, sem dar pista ao robô.
    if (eRobo(bruto)) return json(200, { ok: true }, cab);

    const ip = req.headers.get('cf-connecting-ip');
    if (env.LIMITADOR) {
      const { success } = await env.LIMITADOR.limit({ key: ip ?? 'sem-ip' });
      if (!success) {
        return json(429, { erro: 'Limite de envios por IP excedido.', dica: `Aguarde um minuto e tente de novo. ${DICA_FALLBACK}` }, cab);
      }
    }

    const v = validar(bruto);
    if (!v.ok) return json(400, { erro: v.erro, dica: v.dica }, cab);

    // Turnstile: verificado quando o secret existe (produção). Em dev/testes
    // sem secret, segue sem verificar, no mesmo espírito do LIMITADOR ausente.
    if (env.TURNSTILE_SECRET) {
      const token = typeof (bruto as Record<string, unknown>).token === 'string' ? ((bruto as Record<string, unknown>).token as string) : '';
      if (!token || !(await turnstileOk(token, env.TURNSTILE_SECRET, ip))) {
        return json(403, { erro: 'A verificação anti-robô não passou.', dica: `Recarregue a página e tente de novo. ${DICA_FALLBACK}` }, cab);
      }
    }

    try {
      const { raw } = montarEmail(v.dados, env.REMETENTE, env.DESTINO);
      await env.CORREIO.send(new EmailMessage(env.REMETENTE, env.DESTINO, raw));
    } catch (e) {
      console.error('falha no envio', e);
      return json(502, { erro: 'Não conseguimos entregar sua mensagem agora.', dica: DICA_FALLBACK }, cab);
    }

    return json(200, { ok: true }, cab);
  },
};

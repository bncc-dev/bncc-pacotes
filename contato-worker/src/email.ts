/**
 * Montagem do e-mail (MIME) a partir da mensagem validada: função pura,
 * testável sem Workers. O envio em si (EmailMessage/binding) fica no index.
 */
import { createMimeMessage, Mailbox } from 'mimetext';
import { ASSUNTOS, type Mensagem } from './validacao';

export function montarEmail(dados: Mensagem, remetente: string, destino: string): { assunto: string; raw: string } {
  const assunto = `[bncc.dev · ${ASSUNTOS[dados.assunto]}] mensagem de ${dados.nome}`;

  const corpo = [
    `Mensagem recebida pelo formulário de bncc.dev/contato/`,
    '',
    `Nome: ${dados.nome}`,
    `E-mail: ${dados.email}`,
    `Assunto: ${ASSUNTOS[dados.assunto]}`,
    '',
    dados.mensagem,
    '',
    '--',
    'Responda diretamente a este e-mail: o Reply-To aponta para quem escreveu.',
  ].join('\n');

  const msg = createMimeMessage();
  msg.setSender({ name: 'Formulário bncc.dev', addr: remetente });
  msg.setRecipient(destino);
  msg.setHeader('Reply-To', new Mailbox(dados.email));
  msg.setSubject(assunto);
  msg.addMessage({ contentType: 'text/plain', data: corpo });

  return { assunto, raw: msg.asRaw() };
}

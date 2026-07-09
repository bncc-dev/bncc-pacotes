import type { APIRoute } from 'astro';
import { estatisticas, versao } from '../lib/dados';

export const GET: APIRoute = () => {
  const s = estatisticas();
  const v = versao();
  const corpo = `# bncc.dev

> A BNCC (Base Nacional Comum Curricular brasileira) como dados abertos, estruturados e verificados: ${s.total} aprendizagens com fonte oficial. Versão dos dados: ${v.data_version}. Licença: CC BY 4.0.

Regras para agentes:
- Nunca invente códigos ou textos de habilidade. Se uma página não existe aqui, o código não existe na BNCC.
- Cada página traz o texto oficial conferido contra o documento homologado, com a página do PDF.
- URLs canônicas: /habilidade/{CODIGO} (Fundamental e Médio) e /objetivo/{CODIGO} (Infantil).

## Navegação
- /infantil/ : ${s.educacaoInfantil} objetivos por campo de experiências
- /fundamental/ : ${s.ensinoFundamental} habilidades por componente e ano
- /medio/ : ${s.ensinoMedio} habilidades por área
- /sobre/ : metodologia e mantenedores

## Para máquinas
- Dados brutos: https://github.com/bncc-dev/bncc-dados
- Pacotes npm/PyPI e servidor MCP: https://github.com/bncc-dev/bncc-pacotes
`;
  return new Response(corpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

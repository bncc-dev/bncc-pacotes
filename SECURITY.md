# Política de segurança

## Escopo

Este repositório publica três pacotes (npm `@bncc/dados`, npm `@bncc/mcp`,
PyPI `bncc`) e o Worker do MCP remoto (`mcp-worker/` → mcp.bncc.dev). Não há
autenticação nem dado pessoal aqui. As classes de problema relevantes são:

- Código dos pacotes que execute algo indesejado ao ser importado por um
  consumidor (os pacotes têm zero dependências de runtime justamente para
  reduzir essa superfície).
- Dependência comprometida, ou workflow de CI explorável.
- Falha no `mcp-worker/` que permita abuso do endpoint público
  (mcp.bncc.dev), bypass de rate limit ou negação de serviço.
- Exposição acidental de segredo em qualquer arquivo, **no histórico** ou
  **dentro de um tarball publicado** (o pacote é uma segunda superfície: veja
  `npm pack --dry-run` antes de publicar).
- Cadeia de publicação: comprometimento de credencial de npm ou PyPI, ou
  publicação de artefato que não corresponde ao código deste repositório.

Erro de dado (texto divergente da fonte oficial, código errado) **não é problema
de segurança** e também não se resolve aqui: vai para
[bncc-dados](https://github.com/bncc-dev/bncc-dados), conforme o
[CONTRIBUTING.md](CONTRIBUTING.md).

## Versões cobertas

Sempre o `main` e as versões mais recentes publicadas de cada pacote. Não há
suporte retroativo a versões anteriores; a correção sai como versão nova.

## Como reportar

Envie um e-mail para **contato@bncc.dev** com o assunto começando por
`[seguranca]`. Inclua descrição, passos de reprodução e impacto estimado.

Não abra issue pública para vulnerabilidade antes do contato. Se preferir o
canal do GitHub, use *Security > Report a vulnerability* (private vulnerability
reporting), que também é privado.

## O que esperar

| Etapa | Prazo alvo |
|---|---|
| Confirmação de recebimento | 3 dias úteis |
| Avaliação inicial e classificação | 10 dias úteis |
| Correção ou plano de correção | conforme a severidade, comunicado na avaliação |

Créditos a quem reporta são dados no CHANGELOG e nas notas de release, salvo
pedido de anonimato.

/**
 * Painel de uso das ferramentas do bncc.dev, no terminal.
 *
 * Junta as três fontes (npm/PyPI, Cloudflare e AWS), imprime a tabela e
 * acrescenta uma linha ao histórico. O histórico é o ponto: as três fontes têm
 * retenção curta — o Cloudflare no plano free guarda pouco e limita consulta de
 * zona a um dia por vez, e os registries só devolvem janela móvel. O dado que
 * não for capturado hoje não existe mais depois.
 *
 * Por isso o arquivo de histórico mora FORA do repositório (~/.bncc-estatisticas
 * por padrão): este repo é público, e série de tráfego não é material de
 * divulgação. Nada de IP é coletado ou gravado — a agregação é por serviço.
 *
 * Credenciais: npm e PyPI não pedem nada. Cloudflare usa CLOUDFLARE_API_TOKEN
 * ou, na ausência, o token do wrangler desta máquina. AWS usa o perfil
 * AWS_PROFILE (padrão profy-infra). Faltando qualquer uma, a fonte é reportada
 * como indisponível e o resto do relatório sai igual.
 *
 * Uso:
 *   node scripts/estatisticas.mjs [--dias N] [--json] [--sem-historico]
 *   node scripts/estatisticas.mjs --historico     # série já acumulada
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { coletarTudo, janela } from './lib/coleta.mjs';

const args = process.argv.slice(2);
const temFlag = (n) => args.includes(n);
const valorFlag = (n, padrao) => {
  const i = args.indexOf(n);
  return i === -1 ? padrao : Number(args[i + 1]);
};

const ARQUIVO_HISTORICO =
  process.env.BNCC_ESTATISTICAS_HISTORICO ??
  join(homedir(), '.bncc-estatisticas', 'historico.jsonl');

const negrito = (s) => `\x1b[1m${s}\x1b[0m`;
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const vermelho = (s) => `\x1b[31m${s}\x1b[0m`;

// Limiares: 5xx é falha do servidor e qualquer ocorrência merece olhar; 4xx em
// volume alto costuma ser scanner ou rota documentada errada — sinaliza, mas
// não alarma.
const LIMITE_5XX = 0.01;
const LIMITE_4XX = 0.1;

/**
 * Ícone-resumo do serviço:
 *   ✅ responde agora e sem erro relevante no período
 *   ⚠️  responde, mas com erro acumulado que merece olhar
 *   ❌ não respondeu à verificação
 *   ○  sem URL conhecida, nada a verificar
 */
function sinalNoAr(r) {
  if (!r.saude) return apagado('○');
  if (!r.saude.noAr) return '❌';
  const taxa5xx = (r.erros ?? 0) / (r.requests || 1);
  const taxa4xx = (r.erros4xx ?? 0) / (r.requests || 1);
  if (r.erros > 0 || taxa5xx > LIMITE_5XX || taxa4xx > LIMITE_4XX) return '⚠️';
  return '✅';
}

/** Detalhe do que a verificação encontrou, ao lado da bolinha. */
function detalheNoAr(r) {
  if (!r.saude) return apagado('—');
  if (r.saude.noAr) return apagado(`${r.saude.status} · ${r.saude.ms}ms`);
  return vermelho(r.saude.status ? `HTTP ${r.saude.status}` : 'sem resposta');
}

/** Saúde do serviço a partir da taxa de erro sobre o total de requests. */
function statusServico(r) {
  if (!r.requests) return apagado('sem tráfego');
  const taxa5xx = (r.erros ?? 0) / r.requests;
  const taxa4xx = (r.erros4xx ?? 0) / r.requests;
  if (taxa5xx > LIMITE_5XX) return vermelho(`5xx ${(taxa5xx * 100).toFixed(1)}%`);
  if (r.erros > 0) return amarelo(`${r.erros} 5xx`);
  if (taxa4xx > LIMITE_4XX) return amarelo(`4xx ${(taxa4xx * 100).toFixed(0)}%`);
  return verde('ok');
}

/**
 * Tendência do pacote contra a coleta anterior de MESMA janela: total de 7d e
 * de 14d não se comparam, e cruzá-los inventaria variação que não existe.
 */
function statusPacote(r, anterior) {
  const antes = anterior?.recursos.find((x) => x.recurso === r.recurso)?.total;
  if (!antes) return apagado('—');
  const variacao = ((r.totalSemPicos - antes) / antes) * 100;
  if (Math.abs(variacao) < 5) return apagado('estável');
  const seta = variacao > 0 ? '↑' : '↓';
  return (variacao > 0 ? verde : amarelo)(`${seta} ${Math.abs(variacao).toFixed(0)}%`);
}
const apagado = (s) => `\x1b[2m${s}\x1b[0m`;
const amarelo = (s) => `\x1b[33m${s}\x1b[0m`;
const num = (v) => (v >= 1000 ? v.toLocaleString('pt-BR') : String(v));

// Largura como o terminal vê: sem os códigos de cor, que ocupam bytes mas não
// colunas. Sem isso qualquer célula colorida desalinha a tabela inteira.
// Largura como o terminal desenha: códigos de cor não ocupam coluna alguma, o
// seletor de variação (U+FE0F, invisível) também não, e cada emoji ocupa duas.
const larguraVisivel = (v) => {
  const limpo = String(v)
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/[\uFE0F\u200D]/g, '');
  const emojis = (limpo.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  return [...limpo].length + emojis;
};

function tabela(titulo, colunas, linhas, aEsquerda = [0]) {
  if (!linhas.length) return;
  const larguras = colunas.map((c, i) =>
    Math.max(c.length, ...linhas.map((l) => larguraVisivel(l[i]))),
  );
  const alinhar = (v, i) => {
    const espaco = ' '.repeat(Math.max(0, larguras[i] - larguraVisivel(v)));
    return aEsquerda.includes(i) ? String(v) + espaco : espaco + String(v);
  };
  console.log(`\n${negrito(titulo)}`);
  console.log(apagado('  ' + colunas.map(alinhar).join('  ')));
  for (const l of linhas) console.log('  ' + l.map(alinhar).join('  '));
}

function imprimir(coleta, anterior) {
  const { periodo } = coleta;
  console.log(
    `\n${negrito('Uso das ferramentas do bncc.dev')}  ${apagado(`${periodo.inicio} a ${periodo.fim} (${periodo.dias}d)`)}`,
  );

  const servicos = coleta.recursos.filter((r) => r.tipo === 'servico' && r.requests > 0);
  tabela(
    'Serviços — requests',
    ['', 'recurso', 'no ar', 'total', 'por dia', 'erros', 'origem'],
    servicos
      .sort((a, b) => b.requests - a.requests)
      .map((r) => [
        sinalNoAr(r),
        r.recurso,
        detalheNoAr(r),
        num(r.requests),
        r.mediaDiaria.toFixed(0),
        statusServico(r),
        r.origem,
      ]),
    [0, 1],
  );

  const pacotes = coleta.recursos.filter((r) => r.tipo === 'pacote');
  tabela(
    'Pacotes — downloads',
    ['recurso', 'total', 'sem picos', 'por dia', 'status', 'origem'],
    pacotes
      .sort((a, b) => b.totalSemPicos - a.totalSemPicos)
      .map((r) => [
        r.recurso,
        num(r.total),
        num(r.totalSemPicos),
        r.mediaDiaria.toFixed(1),
        statusPacote(r, anterior),
        r.origem,
      ]),
  );

  const comPico = pacotes.filter((p) => p.picos.length);
  if (comPico.length) {
    console.log(
      apagado(
        `\n  picos descartados (CI/mirror, não adoção): ` +
          comPico.map((p) => `${p.recurso} ${p.picos.join(', ')}`).join(' · '),
      ),
    );
  }

  console.log(
    apagado(
      `\n  ✅ no ar e sem erro · ⚠️ no ar com erro no período · ❌ fora do ar\n` +
        `  no ar: verificação HTTP feita agora (5xx ou sem resposta = fora).\n` +
        `  erros: taxa no período coletado; pacotes = variação contra a\n` +
        `  coleta anterior de mesma janela${anterior ? ` (${anterior.coletadoEm.slice(0, 10)})` : ', ainda sem base'}.`,
    ),
  );
  console.log(
    apagado(
      '\n  Requests e downloads não são comparáveis entre si: uma sessão de agente\n' +
        '  dispara dezenas de chamadas, e um npx baixa o pacote inteiro uma vez.\n' +
        '  Compare cada coluna com ela mesma ao longo do tempo.',
    ),
  );
}

/**
 * Sai por stderr, sempre: uma coleta parcial gravada em silêncio vira buraco
 * inexplicado no histórico semanas depois. Em stdout o aviso se perderia em
 * qualquer redirecionamento para arquivo.
 */
function avisarIndisponiveis(coleta) {
  if (!coleta.indisponiveis.length) return;
  console.error(`\n${amarelo('Fontes indisponíveis')} — a coleta gravada está parcial`);
  for (const f of coleta.indisponiveis) console.error(`  ${f.fonte}: ${f.motivo}`);
}

function gravarHistorico(coleta) {
  mkdirSync(dirname(ARQUIVO_HISTORICO), { recursive: true });
  // Uma linha por execução: JSONL cresce por append, sobrevive a interrupção e
  // é trivial de ler depois com qualquer ferramenta.
  const linha = {
    coletadoEm: coleta.coletadoEm,
    periodo: coleta.periodo,
    recursos: coleta.recursos.map((r) => ({
      recurso: r.recurso,
      tipo: r.tipo,
      origem: r.origem,
      total: r.tipo === 'servico' ? r.requests : r.totalSemPicos,
      mediaDiaria: Number(r.mediaDiaria.toFixed(2)),
      erros: r.erros ?? null,
      noAr: r.saude ? r.saude.noAr : null,
    })),
    indisponiveis: coleta.indisponiveis.map((f) => f.fonte),
  };
  appendFileSync(ARQUIVO_HISTORICO, JSON.stringify(linha) + '\n');
  return linha;
}

function lerHistorico() {
  if (!existsSync(ARQUIVO_HISTORICO)) return [];
  return readFileSync(ARQUIVO_HISTORICO, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/** Última coleta de mesma janela, para a tendência ter base comparável. */
function coletaAnterior(dias) {
  return lerHistorico().filter((l) => l.periodo.dias === dias).at(-1);
}

function mostrarHistorico() {
  if (!existsSync(ARQUIVO_HISTORICO)) {
    console.error(`sem histórico ainda em ${ARQUIVO_HISTORICO}`);
    console.error('rode `node scripts/estatisticas.mjs` para a primeira coleta.');
    process.exit(1);
  }
  const linhas = lerHistorico();
  console.log(`\n${negrito('Histórico')}  ${apagado(`${linhas.length} coleta(s) · ${ARQUIVO_HISTORICO}`)}`);
  const recursos = [...new Set(linhas.flatMap((l) => l.recursos.map((r) => r.recurso)))];
  for (const recurso of recursos) {
    const pontos = linhas
      .map((l) => ({
        em: l.coletadoEm.slice(0, 10),
        janela: l.periodo.dias,
        r: l.recursos.find((x) => x.recurso === recurso),
      }))
      .filter((p) => p.r);
    console.log(`\n  ${negrito(recurso)}`);
    // A janela entra no rótulo porque total de 7d e de 14d não se comparam:
    // sem isso, duas coletas do mesmo dia pareceriam contradizer uma à outra.
    for (const p of pontos) {
      console.log(
        `    ${p.em}  ${String(p.janela).padStart(2)}d  total ${String(num(p.r.total)).padStart(7)}  por dia ${String(p.r.mediaDiaria).padStart(7)}`,
      );
    }
  }
  console.log('');
}

if (temFlag('--historico')) {
  mostrarHistorico();
} else {
  const dias = valorFlag('--dias', 7);
  const anterior = coletaAnterior(dias);
  const coleta = await coletarTudo(janela(dias));
  if (!coleta.recursos.length) {
    console.error('erro: nenhuma fonte respondeu.');
    for (const f of coleta.indisponiveis) console.error(`  ${f.fonte}: ${f.motivo}`);
    process.exit(1);
  }
  if (temFlag('--json')) {
    console.log(JSON.stringify(coleta, null, 2));
  } else {
    imprimir(coleta, anterior);
  }
  avisarIndisponiveis(coleta);
  if (!temFlag('--sem-historico')) {
    gravarHistorico(coleta);
    if (!temFlag('--json')) console.log(apagado(`  histórico: ${ARQUIVO_HISTORICO}\n`));
  }
}

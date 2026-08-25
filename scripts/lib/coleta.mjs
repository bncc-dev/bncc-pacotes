/**
 * Coleta das estatísticas de uso das ferramentas do bncc.dev.
 *
 * Só coleta: nenhuma função aqui imprime nada nem decide formato. É o que
 * permite o mesmo código servir o CLI de hoje e, se um dia fizer sentido, um
 * handler de Lambda — a diferença fica toda em quem chama.
 *
 * São três fontes com naturezas bem diferentes, e a distinção importa mais que
 * a implementação:
 *
 *   - npm e PyPI: dado público, sem credencial. Qualquer pessoa obtém.
 *   - Cloudflare (MCP remoto): exige token e cobre os Workers da conta.
 *   - AWS (API em ECS): exige perfil e vive em conta compartilhada com a Profy.
 *
 * Por isso cada coletor falha de forma isolada: sem credencial, a fonte é
 * marcada como indisponível e o resto do relatório sai igual. Nada aqui lê ou
 * grava IP — a agregação é sempre por serviço.
 */
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execArquivo = promisify(execFile);

export const PACOTES_NPM = ['@bncc/dados', '@bncc/mcp'];
export const PACOTES_PYPI = ['bncc'];
export const HOSTS_AWS = ['api.bncc.dev', 'bncc.dev', 'playground.bncc.dev'];
// Os registries consolidam o dia em UTC com atraso; contar o dia corrente faria
// toda leitura terminar num tombo falso.
export const ATRASO_DIAS = 2;
// Dia muito acima da mediana, em pacote deste tamanho, é CI/mirror/agregador —
// não adoção. O relatório separa em vez de deixar inflar a média.
export const FATOR_PICO = 5;

export const diaISO = (d) => d.toISOString().slice(0, 10);

/** Janela padrão: N dias fechados, terminando antes do atraso de consolidação. */
export function janela(dias = 7, referencia = new Date()) {
  const fim = new Date(referencia);
  fim.setUTCDate(fim.getUTCDate() - ATRASO_DIAS);
  const inicio = new Date(fim);
  inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));
  return { inicio: diaISO(inicio), fim: diaISO(fim), dias };
}

async function json(url, opcoes = {}) {
  const r = await fetch(url, {
    ...opcoes,
    headers: { 'user-agent': 'bncc-pacotes/estatisticas', ...(opcoes.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} em ${new URL(url).host}`);
  return r.json();
}

const mediana = (ns) => {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Separa a série em base limpa e picos suspeitos, pela mediana. */
export function analisarSerie(serie) {
  const med = mediana(serie.map((d) => d.downloads).filter((v) => v > 0));
  const picos = serie.filter((d) => med > 0 && d.downloads > med * FATOR_PICO);
  const normais = serie.filter((d) => !picos.includes(d));
  const totalLimpo = normais.reduce((s, d) => s + d.downloads, 0);
  return {
    total: serie.reduce((s, d) => s + d.downloads, 0),
    totalSemPicos: totalLimpo,
    mediaDiaria: normais.length ? totalLimpo / normais.length : 0,
    mediana: med,
    picos: picos.map((p) => p.dia),
    serie,
  };
}

// ------------------------------------------------------------------ npm/PyPI

export async function coletarNpm(pacote, { inicio, fim }) {
  const faixa = `${inicio}:${fim}`;
  const { downloads } = await json(
    `https://api.npmjs.org/downloads/range/${faixa}/${encodeURIComponent(pacote)}`,
  );
  return {
    recurso: pacote,
    tipo: 'pacote',
    origem: 'npm',
    ...analisarSerie(downloads.map((d) => ({ dia: d.day, downloads: d.downloads }))),
  };
}

export async function coletarPypi(pacote, { inicio, fim }) {
  const { data } = await json(`https://pypistats.org/api/packages/${pacote}/overall`);
  const naJanela = (r) => r.date >= inicio && r.date <= fim;
  // Sem descontar mirrors o número quase dobra: bandersnatch espelhando não é
  // gente instalando.
  const semMirror = data
    .filter((r) => r.category === 'without_mirrors' && naJanela(r))
    .map((r) => ({ dia: r.date, downloads: r.downloads }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
  const comMirror = data
    .filter((r) => r.category === 'with_mirrors' && naJanela(r))
    .reduce((s, r) => s + r.downloads, 0);
  return { recurso: pacote, tipo: 'pacote', origem: 'PyPI', comMirror, ...analisarSerie(semMirror) };
}

// ---------------------------------------------------------------- Cloudflare

/**
 * O token do wrangler serve para uso interativo, mas expira e é renovado pelo
 * próprio wrangler — não serve para execução desacompanhada. Por isso a env var
 * tem precedência: num agendamento, use um API token dedicado com escopo de
 * leitura de analytics, nunca este OAuth (que tem escrita em Workers e DNS).
 */
export function tokenCloudflare() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const cfg = join(homedir(), 'Library/Preferences/.wrangler/config/default.toml');
  const achado = readFileSync(cfg, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!achado) throw new Error('sem CLOUDFLARE_API_TOKEN e sem token do wrangler');
  return achado[1];
}

async function graphqlCloudflare(token, query, variables) {
  const r = await json('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (r.errors?.length) throw new Error(r.errors[0].message);
  return r.data;
}

/** Workers da conta, um registro por script. Descobre a conta pelo token. */
export async function coletarCloudflare({ inicio, fim }) {
  const token = tokenCloudflare();
  const contas = await json('https://api.cloudflare.com/client/v4/accounts', {
    headers: { authorization: `Bearer ${token}` },
  });
  const conta = process.env.CLOUDFLARE_ACCOUNT_ID ?? contas.result?.[0]?.id;
  if (!conta) throw new Error('nenhuma conta Cloudflare acessível com este token');

  const dados = await graphqlCloudflare(
    token,
    `query($acc:String!,$de:Time!,$ate:Time!){viewer{accounts(filter:{accountTag:$acc}){
       workersInvocationsAdaptive(limit:100,filter:{datetime_geq:$de,datetime_leq:$ate}){
         sum{requests errors}dimensions{scriptName}}}}}`,
    { acc: conta, de: `${inicio}T00:00:00Z`, ate: `${fim}T23:59:59Z` },
  );
  const dominios = await json(
    `https://api.cloudflare.com/client/v4/accounts/${conta}/workers/domains`,
    { headers: { authorization: `Bearer ${token}` } },
  ).catch(() => ({ result: [] }));
  const urlPorScript = new Map(
    (dominios.result ?? []).map((d) => [d.service, `https://${d.hostname}`]),
  );

  const linhas = dados.viewer.accounts[0]?.workersInvocationsAdaptive ?? [];
  // Um mesmo script aparece em várias linhas (uma por status); somar.
  const porScript = new Map();
  for (const l of linhas) {
    const nome = l.dimensions.scriptName;
    const atual = porScript.get(nome) ?? { requests: 0, erros: 0 };
    atual.requests += l.sum.requests;
    atual.erros += l.sum.errors;
    porScript.set(nome, atual);
  }
  return [...porScript].map(([recurso, v]) => ({
    recurso,
    tipo: 'servico',
    origem: 'Cloudflare Workers',
    url: urlPorScript.get(recurso) ?? null,
    requests: v.requests,
    erros: v.erros,
    mediaDiaria: v.requests / diasEntre(inicio, fim),
  }));
}

const diasEntre = (inicio, fim) =>
  Math.max(1, Math.round((Date.parse(fim) - Date.parse(inicio)) / 86400000) + 1);

// ----------------------------------------------------------------------- AWS

const aws = async (args) => {
  const { stdout } = await execArquivo('aws', [...args, '--output', 'json'], {
    env: {
      ...process.env,
      AWS_PROFILE: process.env.AWS_PROFILE ?? 'profy-infra',
      AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
    },
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim() ? JSON.parse(stdout) : null;
};

/**
 * O ALB é compartilhado (BNCC e Profy no mesmo gateway), então medir no nível
 * do balanceador misturaria os projetos: o número por host vem do target group.
 * E o mapa host → target group é descoberto a cada execução, nunca fixado —
 * cada deploy blue/green cria target groups novos, e um ARN colado aqui
 * silenciosamente pararia de refletir a realidade.
 */
export async function coletarAws({ inicio, fim }, hosts = HOSTS_AWS) {
  const { LoadBalancers: balanceadores } = await aws(['elbv2', 'describe-load-balancers']);
  const alb = balanceadores.find((b) => b.Type === 'application');
  if (!alb) throw new Error('nenhum Application Load Balancer na conta');
  const dimensaoLb = alb.LoadBalancerArn.split(':loadbalancer/')[1];

  const { Listeners: ouvintes } = await aws([
    'elbv2', 'describe-listeners', '--load-balancer-arn', alb.LoadBalancerArn,
  ]);
  const porHost = new Map(hosts.map((h) => [h, new Set()]));
  for (const ouvinte of ouvintes) {
    const { Rules: regras } = await aws(['elbv2', 'describe-rules', '--listener-arn', ouvinte.ListenerArn]);
    for (const regra of regras) {
      const nomes = regra.Conditions
        .filter((c) => c.Field === 'host-header')
        .flatMap((c) => c.Values ?? c.HostHeaderConfig?.Values ?? []);
      const alvos = regra.Actions.flatMap((a) => [
        ...(a.ForwardConfig?.TargetGroups ?? []).map((t) => t.TargetGroupArn),
        ...(a.TargetGroupArn ? [a.TargetGroupArn] : []),
      ]);
      for (const host of nomes) {
        if (porHost.has(host)) alvos.forEach((t) => porHost.get(host).add(t));
      }
    }
  }

  const resultados = [];
  for (const [host, alvos] of porHost) {
    if (!alvos.size) continue;
    let requests = 0;
    let erros5xx = 0;
    let erros4xx = 0;
    for (const alvo of alvos) {
      const dimensaoTg = alvo.split(':').pop();
      const dims = [
        `Name=TargetGroup,Value=${dimensaoTg}`,
        `Name=LoadBalancer,Value=${dimensaoLb}`,
      ];
      const soma = async (metrica) => {
        const r = await aws([
          'cloudwatch', 'get-metric-statistics',
          '--namespace', 'AWS/ApplicationELB', '--metric-name', metrica,
          '--dimensions', ...dims,
          '--start-time', `${inicio}T00:00:00Z`, '--end-time', `${fim}T23:59:59Z`,
          '--period', '2592000', '--statistics', 'Sum',
        ]);
        return r?.Datapoints?.reduce((s, d) => s + d.Sum, 0) ?? 0;
      };
      requests += await soma('RequestCountPerTarget');
      erros5xx += await soma('HTTPCode_Target_5XX_Count');
      erros4xx += await soma('HTTPCode_Target_4XX_Count');
    }
    resultados.push({
      recurso: host,
      tipo: 'servico',
      origem: 'AWS ECS',
      url: `https://${host}`,
      requests,
      erros: erros5xx,
      erros4xx,
      mediaDiaria: requests / diasEntre(inicio, fim),
    });
  }
  return resultados;
}

// -------------------------------------------------------------- disponibilidade

export const TIMEOUT_SAUDE_MS = 8000;

/**
 * Um GET por serviço. "No ar" é responder HTTP, não responder 200: o MCP
 * devolve 405 a GET sem Accept de navegador e o endpoint de contato só aceita
 * POST — ambos saudáveis. Off é o que não responde ou devolve 5xx.
 */
export async function verificarDisponibilidade(url) {
  if (!url) return null;
  const inicio = Date.now();
  try {
    const r = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': 'bncc-pacotes/estatisticas (verificacao de saude)' },
      signal: AbortSignal.timeout(TIMEOUT_SAUDE_MS),
    });
    return { noAr: r.status < 500, status: r.status, ms: Date.now() - inicio };
  } catch (e) {
    return { noAr: false, status: null, ms: Date.now() - inicio, motivo: e.message };
  }
}

// ------------------------------------------------------------------ orquestra

/**
 * Roda todas as fontes em paralelo. Nenhuma falha derruba as outras: o retorno
 * traz `recursos` com o que deu certo e `indisponiveis` com o motivo de cada
 * fonte que faltou — um relatório parcial e honesto vale mais que um erro seco.
 */
export async function coletarTudo(periodo) {
  const fontes = [
    ...PACOTES_NPM.map((p) => ['npm ' + p, () => coletarNpm(p, periodo).then((r) => [r])]),
    ...PACOTES_PYPI.map((p) => ['PyPI ' + p, () => coletarPypi(p, periodo).then((r) => [r])]),
    ['Cloudflare', () => coletarCloudflare(periodo)],
    ['AWS', () => coletarAws(periodo)],
  ];
  const resultados = await Promise.all(
    fontes.map(async ([nome, executar]) => {
      try {
        return { nome, recursos: await executar() };
      } catch (e) {
        return { nome, erro: e.message };
      }
    }),
  );
  const recursos = resultados.flatMap((r) => r.recursos ?? []);
  await Promise.all(
    recursos
      .filter((r) => r.url)
      .map(async (r) => {
        r.saude = await verificarDisponibilidade(r.url);
      }),
  );

  return {
    coletadoEm: new Date().toISOString(),
    periodo,
    recursos,
    indisponiveis: resultados.filter((r) => r.erro).map((r) => ({ fonte: r.nome, motivo: r.erro })),
  };
}

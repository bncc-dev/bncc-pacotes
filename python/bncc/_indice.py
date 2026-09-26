"""Carregamento lazy dos dados embutidos e índices em memória."""
import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

_DADOS = Path(__file__).parent / 'dados'


def _carregar(arquivo):
    return json.loads((_DADOS / f'{arquivo}.json').read_text(encoding='utf-8'))


@lru_cache(maxsize=1)
def indice():
    estrutura = _carregar('estrutura')
    ei = _carregar('educacao-infantil')
    ef = _carregar('ensino-fundamental')
    em = _carregar('ensino-medio')
    # Complemento de Computação (Parecer CNE/CEB 2/2022), incluído por padrão desde a 0.2.0 do PyPI
    co = _carregar('computacao')

    por_codigo = {}
    for o in ei['objetivos']:
        por_codigo[o['codigo']] = o
    for h in ef['habilidades'] + em['habilidades']:
        por_codigo[h['codigo']] = h
    for r in co['objetivos_ei'] + co['habilidades_ef'] + co['habilidades_em']:
        por_codigo[r['codigo']] = r

    contextos = {c['id']: c for c in ef['contextos_organizacao'] + em['contextos_organizacao']}
    competencias = {c['id']: c for c in estrutura['competencias_especificas']}
    alinhamentos = {a['id']: a for a in ei['alinhamentos']}
    nomes = {}
    for c in estrutura['componentes_curriculares'] + estrutura['areas_conhecimento'] + estrutura['campos_experiencias']:
        nomes[c['id']] = c['nome']

    return {
        'estrutura': estrutura,
        'objetivos_ei': ei['objetivos'], 'alinhamentos': ei['alinhamentos'],
        'habilidades_ef': ef['habilidades'], 'habilidades_em': em['habilidades'],
        'por_codigo': por_codigo, 'contextos': contextos,
        'competencias': competencias, 'alinhamento_por_id': alinhamentos, 'nomes': nomes,
        'co_objetivos_ei': co['objetivos_ei'], 'co_habilidades_ef': co['habilidades_ef'],
        'co_habilidades_em': co['habilidades_em'],
        'co_eixos': {e['id']: e['nome'] for e in co['eixos']},
        'co_objetos': {o['id']: o['nome'] for o in co['objetos_conhecimento']},
        'co_competencias': {c['id']: c for c in co['competencias']},
    }


def versao():
    """Metadados dos dados embutidos: data-version, commit de origem, checksums."""
    return json.loads((_DADOS / 'VERSAO.json').read_text(encoding='utf-8'))


def normalizar_texto(t):
    """Normalização de busca: sem acentos, minúsculas, espaços únicos (mesma regra do @bncc/dados)."""
    t = unicodedata.normalize('NFD', t)
    t = ''.join(ch for ch in t if not unicodedata.combining(ch))
    return re.sub(r'\s+', ' ', t.casefold()).strip()


def normalizar_busca(t):
    """Normalização de consulta: normalizar_texto + pontuação vira espaço (interna a buscar)."""
    return normalizar_texto(re.sub(r'[.,;:!?()"\'«»“”‘’\[\]/-]', ' ', t))


# Palavras vazias do português ignoradas por buscar (DECISOES.md D10). Lista
# fixa e curta, idêntica à do pacote npm; consulta só de palavras vazias devolve vazio.
STOPWORDS = frozenset(
    'de a o e em para da do das dos na no nas nos com por um uma uns umas as os que ao aos se sua suas seu seus ou como sobre entre etc pelo pela pelos pelas'.split()
)

_RADICAL_PLURAL = [('coes', 'cao'), ('oes', 'ao'), ('aes', 'ao'), ('ais', 'al'), ('eis', 'el'), ('ois', 'ol'),
                   ('is', 'il'), ('ns', 'm'), ('res', 'r'), ('zes', 'z'), ('ses', 's'), ('s', '')]
_RADICAL_FORTE = [('mente', ''), ('cao', 'c'), ('ao', '')]
_RADICAL_DERIVACIONAL = [('cionari', 'c'), ('cional', 'c'), ('idad', ''), ('ment', '')]


def _trocar_sufixo(w, regras):
    for suf, rep in regras:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[:-len(suf)] + rep
    return None


def radical(palavra):
    """Radical de uma palavra já normalizada, por regras curtas de plural, gênero e
    sufixos frequentes do português. Não é um stemmer completo: o objetivo é `fracao`,
    `fracoes` e `fracionario` caírem no mesmo radical sem que `texto` case `contexto`.
    Regras e colisões aceitas em DECISOES.md D10. Idêntica à função `radical` do npm."""
    w = palavra
    if len(w) <= 3:
        return w
    w = _trocar_sufixo(w, _RADICAL_PLURAL) or w
    forte = _trocar_sufixo(w, _RADICAL_FORTE)
    if forte is not None:
        return forte
    if len(w) >= 5 and w[-1] in 'aoe':
        w = w[:-1]
    return _trocar_sufixo(w, _RADICAL_DERIVACIONAL) or w


def tokenizar(texto):
    """Tokens de busca de um texto: normalizado, sem palavras vazias, por radical."""
    return [radical(w) for w in normalizar_busca(texto).split(' ') if w and w not in STOPWORDS]


def resolver_nome(id_):
    i = indice()
    ctx = i['contextos'].get(id_)
    if ctx:
        return ctx['nome']
    return i['nomes'].get(id_, id_)

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

    por_codigo = {}
    for o in ei['objetivos']:
        por_codigo[o['codigo']] = o
    for h in ef['habilidades'] + em['habilidades']:
        por_codigo[h['codigo']] = h

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
    }


def versao():
    """Metadados dos dados embutidos: data-version, commit de origem, checksums."""
    return json.loads((_DADOS / 'VERSAO.json').read_text(encoding='utf-8'))


def normalizar_texto(t):
    """Normalização de busca: sem acentos, minúsculas, espaços únicos (mesma regra do @bncc/dados)."""
    t = unicodedata.normalize('NFD', t)
    t = ''.join(ch for ch in t if not unicodedata.combining(ch))
    return re.sub(r'\s+', ' ', t.casefold()).strip()


def resolver_nome(id_):
    i = indice()
    ctx = i['contextos'].get(id_)
    if ctx:
        return ctx['nome']
    return i['nomes'].get(id_, id_)

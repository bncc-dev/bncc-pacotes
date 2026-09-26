"""API de consulta em português — espelho 1:1 do pacote npm @bncc/dados (snake_case)."""
from ._codigos import decodificar
import math
from functools import lru_cache

from ._indice import indice, normalizar_busca, resolver_nome, tokenizar, versao as _versao


def _resolver_co(reg):
    i = indice()
    etapa = decodificar(reg['codigo'])['etapa']
    base = {'codigo': reg['codigo'], 'etapa': etapa, 'texto': reg['texto'],
            'vigencia': reg['vigencia'], 'fonte': reg['fonte'],
            'documento': 'computacao-2022'}
    if etapa == 'EI':
        return {**base,
                'eixo': {'id': reg['eixo'], 'nome': i['co_eixos'].get(reg['eixo'], reg['eixo'])},
                'grupo_etario': reg['grupo_etario']}
    if etapa == 'EF':
        return {**base,
                'componente': {'id': 'co-comp-computacao', 'nome': 'Computação'},
                'anos': reg['anos'],
                'eixo': {'id': reg['eixo'], 'nome': i['co_eixos'].get(reg['eixo'], reg['eixo'])},
                'objetos_conhecimento': [{'id': o, 'nome': i['co_objetos'].get(o, o)}
                                         for o in reg['objetos_conhecimento']]}
    c = i['co_competencias'].get(reg['competencia'], {})
    return {**base,
            'componente': {'id': 'co-comp-computacao', 'nome': 'Computação'},
            'competencia_computacao': {'id': reg['competencia'],
                                       'numero': c.get('numero', 0), 'texto': c.get('texto', '')}}


def _resolver(reg):
    if reg.get('documento') == 'computacao-2022':
        return _resolver_co(reg)
    i = indice()
    etapa = decodificar(reg['codigo'])['etapa']
    base = {'codigo': reg['codigo'], 'etapa': etapa, 'texto': reg['texto'],
            'vigencia': reg['vigencia'], 'fonte': reg['fonte']}

    if etapa == 'EI':
        return {**base,
                'campo_experiencias': {'id': reg['campo_experiencias'], 'nome': resolver_nome(reg['campo_experiencias'])},
                'grupo_etario': reg['grupo_etario'],
                'alinhamento': reg['alinhamento']}

    if etapa == 'EF':
        org = reg['organizacao']
        nomes = {}
        if 'unidade_tematica' in org:
            nomes['unidade_tematica'] = resolver_nome(org['unidade_tematica'])
        if org['tipo'] == 'campo_pratica':
            nomes['campos_atuacao'] = [resolver_nome(c) for c in org['campos_atuacao']]
            nomes['pratica_linguagem'] = resolver_nome(org['pratica_linguagem'])
        if org['tipo'] == 'eixo':
            nomes['eixo'] = resolver_nome(org['eixo'])
        return {**base,
                'componente': {'id': reg['componente'], 'nome': resolver_nome(reg['componente'])},
                'anos': reg['anos'],
                'organizacao': {'tipo': org['tipo'], 'nomes': nomes},
                'objetos_conhecimento': [{'id': o, 'nome': resolver_nome(o)} for o in reg['objetos_conhecimento']]}

    comps = []
    for cid in reg['competencias_especificas']:
        c = indice()['competencias'].get(cid, {})
        comps.append({'id': cid, 'numero': c.get('numero', 0), 'texto': c.get('texto', '')})
    return {**base,
            'area': {'id': reg['area'], 'nome': resolver_nome(reg['area'])},
            'componente': ({'id': reg['componente'], 'nome': resolver_nome(reg['componente'])}
                           if reg['componente'] else None),
            'competencias_especificas': comps,
            'campos_atuacao_social': ([{'id': c, 'nome': resolver_nome(c)} for c in reg['campos_atuacao_social']]
                                      if reg['campos_atuacao_social'] else None)}


def por_codigo(codigo):
    """Registro completo de uma aprendizagem pelo código (case-insensitive), com nomes resolvidos."""
    cod = codigo.strip().upper()
    reg = indice()['por_codigo'].get(cod)
    if reg is None:
        decodificar(cod)  # gramática inválida gera o erro explicativo
        raise ValueError(f'{cod}: código válido na forma, mas não existe na BNCC '
                         '(dica: a numeração tem lacunas legítimas)')
    return _resolver(reg)


def _id_componente(componente):
    if componente is None:
        return None
    return componente if componente.startswith('ef-comp-') else f'ef-comp-{componente.lower()}'


def habilidades_ef(componente=None, ano=None, unidade_tematica=None, pratica=None, campo_atuacao=None):
    """Habilidades do Ensino Fundamental, com filtros opcionais (sigla ou id de componente)."""
    # Computação só com filtro explícito (componente 'CO'); o padrão segue BNCC 2018.
    if componente and componente.lower() in ('co', 'co-comp-computacao', 'ef-comp-co'):
        if unidade_tematica or pratica or campo_atuacao:
            return []
        return [_resolver(h) for h in indice()['co_habilidades_ef']
                if not ano or ano in h['anos']]
    comp = _id_componente(componente)
    saida = []
    for h in indice()['habilidades_ef']:
        org = h['organizacao']
        if comp and h['componente'] != comp:
            continue
        if ano and ano not in h['anos']:
            continue
        if unidade_tematica and not ('unidade_tematica' in org and resolver_nome(org['unidade_tematica']) == unidade_tematica):
            continue
        if pratica and not (org['tipo'] == 'campo_pratica' and resolver_nome(org['pratica_linguagem']) == pratica):
            continue
        if campo_atuacao and not (org['tipo'] == 'campo_pratica'
                                  and any(resolver_nome(c) == campo_atuacao for c in org['campos_atuacao'])):
            continue
        saida.append(_resolver(h))
    return saida


def habilidades_em(area=None, competencia=None, apenas_lp=False):
    """Habilidades do Ensino Médio. `area` aceita id (em-area-lgg) ou sigla (LGG)."""
    # Computação só com filtro explícito (area 'CO'); o padrão segue BNCC 2018.
    if area and area.lower() in ('co', 'em-area-co'):
        if competencia or apenas_lp:
            return []
        return [_resolver(h) for h in indice()['co_habilidades_em']]
    aid = area if (area is None or area.startswith('em-area-')) else f'em-area-{area.lower()}'
    i = indice()
    saida = []
    for h in i['habilidades_em']:
        if aid and h['area'] != aid:
            continue
        if apenas_lp and h['componente'] != 'em-comp-lp':
            continue
        if competencia and not any(i['competencias'].get(c, {}).get('numero') == competencia
                                   for c in h['competencias_especificas']):
            continue
        saida.append(_resolver(h))
    return saida


def objetivos_ei(campo=None, grupo_etario=None):
    """Objetivos da Educação Infantil. `campo` aceita id (ei-campo-ts) ou sigla (TS)."""
    # Computação só com filtro explícito (campo 'CO'); o padrão segue BNCC 2018.
    if campo and campo.lower() in ('co', 'ei-campo-co'):
        gid = grupo_etario if (grupo_etario is None or grupo_etario.startswith('ei-grupo-')) else f'ei-grupo-{grupo_etario}'
        return [_resolver(o) for o in indice()['co_objetivos_ei']
                if not gid or o['grupo_etario'] == gid]
    cid = campo if (campo is None or campo.startswith('ei-campo-')) else f'ei-campo-{campo.lower()}'
    gid = grupo_etario if (grupo_etario is None or grupo_etario.startswith('ei-grupo-')) else f'ei-grupo-{grupo_etario}'
    return [_resolver(o) for o in indice()['objetivos_ei']
            if (not cid or o['campo_experiencias'] == cid) and (not gid or o['grupo_etario'] == gid)]


# Parâmetros do BM25 (DECISOES.md D10). Os mesmos no pacote npm.
_BM25_K1 = 1.2
_BM25_B = 0.75
_PESO_CAMPOS = 0.5


def _nome_co(id_):
    i = indice()
    return i['co_eixos'].get(id_) or i['co_objetos'].get(id_) or resolver_nome(id_)


def _texto_campos(reg):
    """Nomes dos campos estruturais que entram no índice, além do enunciado."""
    ids = []
    if reg.get('documento') == 'computacao-2022':
        ids.append('Computação')
        if 'eixo' in reg:
            ids.append(reg['eixo'])
        ids += reg.get('objetos_conhecimento') or []
        return ' '.join(_nome_co(x) for x in ids)
    if reg.get('campo_experiencias'):
        ids.append(reg['campo_experiencias'])
    if reg.get('area'):
        ids.append(reg['area'])
    if reg.get('componente'):
        ids.append(reg['componente'])
    org = reg.get('organizacao') or {}
    if 'unidade_tematica' in org:
        ids.append(org['unidade_tematica'])
    if org.get('tipo') == 'campo_pratica':
        ids.append(org['pratica_linguagem'])
    if org.get('tipo') == 'eixo':
        ids.append(org['eixo'])
    ids += reg.get('objetos_conhecimento') or []
    return ' '.join(resolver_nome(x) for x in ids)


def _contar(tokens):
    m = {}
    for t in tokens:
        m[t] = m.get(t, 0) + 1
    return m


@lru_cache(maxsize=1)
def _indice_busca():
    i = indice()
    universo = (i['objetivos_ei'] + i['habilidades_ef'] + i['habilidades_em']
                + i['co_objetivos_ei'] + i['co_habilidades_ef'] + i['co_habilidades_em'])
    docs, df, soma = [], {}, 0
    for reg in universo:
        te = tokenizar(reg['texto'])
        tc = tokenizar(_texto_campos(reg))
        doc = {'reg': reg, 'texto_norm': normalizar_busca(reg['texto']),
               'enunciado': _contar(te), 'campos': _contar(tc), 'tamanho': len(te) + len(tc)}
        soma += doc['tamanho']
        for t in set(te + tc):
            df[t] = df.get(t, 0) + 1
        docs.append(doc)
    return {'docs': docs, 'df': df, 'tamanho_medio': soma / len(docs)}


def buscar(texto, etapa=None, componente=None, ano=None):
    """Busca textual nos enunciados, ordenada por relevância, sem rede.

    Ranking determinístico (issue #14, DECISOES.md D10): consulta e enunciado são
    reduzidos a radicais sem palavras vazias; a pontuação é BM25 sobre o enunciado
    mais os campos estruturais (peso menor). Estratos: enunciado idêntico à consulta;
    (A) todos os radicais e o trecho literal; (B) todos os radicais; (C) parte dos
    radicais, só quando os anteriores estão vazios. Dentro de cada estrato, por pontuação decrescente e código. Cada
    item traz 'pontuacao'.
    """
    alvo = normalizar_busca(texto)
    termos = list(dict.fromkeys(tokenizar(texto)))
    if not termos:
        return []
    # Computação: os registros CO não trazem o campo `componente` (ele é
    # sintetizado na resolução), então o filtro restringe às habilidades EF de
    # Computação, mesma regra de habilidades_ef (issue #8).
    filtra_co = bool(componente) and componente.lower() in ('co', 'co-comp-computacao', 'ef-comp-co')
    comp = None
    if componente and not filtra_co:
        comp = componente if '-comp-' in componente else f'ef-comp-{componente.lower()}'
    ib = _indice_busca()
    n = len(ib['docs'])
    df, tamanho_medio = ib['df'], ib['tamanho_medio']
    pontuados = []
    for doc in ib['docs']:
        r = doc['reg']
        if etapa and decodificar(r['codigo'])['etapa'] != etapa:
            continue
        if filtra_co and not (r.get('documento') == 'computacao-2022' and 'anos' in r):
            continue
        if comp and r.get('componente') != comp:
            continue
        if ano and ano not in r.get('anos', []):
            continue
        casados, s = 0, 0.0
        for t in termos:
            f = doc['enunciado'].get(t, 0) + _PESO_CAMPOS * doc['campos'].get(t, 0)
            if f == 0:
                continue
            casados += 1
            d = df.get(t, 0)
            idf = math.log(1 + (n - d + 0.5) / (d + 0.5))
            s += idf * (f * (_BM25_K1 + 1)) / (f + _BM25_K1 * (1 - _BM25_B + _BM25_B * doc['tamanho'] / tamanho_medio))
        if casados == 0:
            continue
        # O trecho literal só distingue consultas de duas ou mais palavras; com
        # uma só, ele reintroduziria a diferença singular/plural que o radical apagou.
        literal = len(termos) >= 2 and alvo in doc['texto_norm']
        # Enunciado idêntico à consulta vem antes dos que apenas a contêm: um
        # texto mais longo que inclui a consulta pode pontuar mais no BM25.
        exato = doc['texto_norm'] == alvo
        pontuados.append((doc, casados, literal, round(s * 1000) / 1000, exato))
    chave = lambda p: (-p[3], p[0]['reg']['codigo'])
    todos = [p for p in pontuados if p[1] == len(termos)]
    if todos:
        escolhidos = (sorted([p for p in todos if p[4]], key=chave)
                      + sorted([p for p in todos if p[2] and not p[4]], key=chave)
                      + sorted([p for p in todos if not p[2] and not p[4]], key=chave))
    else:
        escolhidos = sorted(pontuados, key=chave)
    return [{**_resolver(p[0]['reg']), 'pontuacao': p[3]} for p in escolhidos]


def progressao_ei(codigo):
    """Progressão oficial da EI: os objetivos do mesmo aspecto nas três faixas etárias."""
    reg = por_codigo(codigo)
    if reg['etapa'] != 'EI':
        raise ValueError(f"{reg['codigo']}: progressão por alinhamento só existe na Educação Infantil")
    if reg.get('documento') == 'computacao-2022':
        raise ValueError(f"{reg['codigo']}: objetivos do complemento de Computação não têm alinhamento "
                         'oficial entre grupos etários (dica: a progressão por alinhamento cobre só os '
                         'objetivos da BNCC 2018)')
    al = indice()['alinhamento_por_id'][reg['alinhamento']]
    return {'alinhamento': al['id'], 'objetivos': [por_codigo(c) for c in al['objetivos']],
            'nota': al.get('nota')}


def estrutura():
    """A espinha estrutural completa (etapas, áreas, componentes, competências, recortes)."""
    return indice()['estrutura']


def estatisticas():
    """Contagens do dataset."""
    i = indice()
    co_total = len(i['co_objetivos_ei']) + len(i['co_habilidades_ef']) + len(i['co_habilidades_em'])
    return {
        'total': len(i['objetivos_ei']) + len(i['habilidades_ef']) + len(i['habilidades_em']) + co_total,
        'educacao_infantil': len(i['objetivos_ei']),
        'ensino_fundamental': len(i['habilidades_ef']),
        'ensino_medio': len(i['habilidades_em']),
        'alinhamentos_ei': len(i['alinhamentos']),
        'competencias_gerais': len(i['estrutura']['competencias_gerais']),
        'competencias_especificas': len(i['estrutura']['competencias_especificas']),
        'computacao': co_total,
    }


def versao():
    """Data-version, commit de origem e checksums dos dados embutidos."""
    return _versao()

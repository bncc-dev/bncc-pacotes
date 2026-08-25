"""API de consulta em português — espelho 1:1 do pacote npm @bncc/dados (snake_case)."""
from ._codigos import decodificar
from ._indice import indice, normalizar_texto, resolver_nome, versao as _versao


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


def buscar(texto, etapa=None, componente=None, ano=None):
    """Busca textual normalizada (sem acentos/caixa) nos enunciados. Sem rede."""
    alvo = normalizar_texto(texto)
    i = indice()
    universo = []
    if etapa in (None, 'EI'):
        universo += i['objetivos_ei']
    if etapa in (None, 'EF'):
        universo += i['habilidades_ef']
    if etapa in (None, 'EM'):
        universo += i['habilidades_em']
    if etapa in (None, 'EI'):
        universo += i['co_objetivos_ei']
    if etapa in (None, 'EF'):
        universo += i['co_habilidades_ef']
    if etapa in (None, 'EM'):
        universo += i['co_habilidades_em']
    # Computação: os registros CO não trazem o campo `componente` (ele é
    # sintetizado na resolução), então o filtro restringe às habilidades EF de
    # Computação, mesma regra de habilidades_ef (issue #8).
    filtra_co = bool(componente) and componente.lower() in ('co', 'co-comp-computacao', 'ef-comp-co')
    comp = None
    if componente and not filtra_co:
        comp = componente if '-comp-' in componente else f'ef-comp-{componente.lower()}'
    saida = []
    for r in universo:
        if alvo not in normalizar_texto(r['texto']):
            continue
        if filtra_co and not (r.get('documento') == 'computacao-2022' and 'anos' in r):
            continue
        if comp and r.get('componente') != comp:
            continue
        if ano and ano not in r.get('anos', []):
            continue
        saida.append(_resolver(r))
    return saida


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

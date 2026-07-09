"""Integração opcional com pandas (extra `bncc[pandas]`)."""


def para_dataframe(etapa='EF'):
    """DataFrame plano das aprendizagens de uma etapa ('EI', 'EF' ou 'EM').

    Requer o extra: pip install bncc[pandas]
    """
    try:
        import pandas as pd
    except ImportError as e:
        raise ImportError('para_dataframe requer pandas: pip install bncc[pandas]') from e

    from ._consultas import habilidades_ef, habilidades_em, objetivos_ei

    if etapa == 'EF':
        registros = habilidades_ef()
        linhas = [{
            'codigo': r['codigo'], 'componente': r['componente']['nome'],
            'anos': ' | '.join(map(str, r['anos'])),
            'organizacao': r['organizacao']['tipo'],
            'texto': r['texto'],
        } for r in registros]
    elif etapa == 'EM':
        linhas = [{
            'codigo': r['codigo'], 'area': r['area']['nome'],
            'componente': r['componente']['nome'] if r['componente'] else None,
            'competencias': ' | '.join(str(c['numero']) for c in r['competencias_especificas']),
            'texto': r['texto'],
        } for r in habilidades_em()]
    elif etapa == 'EI':
        linhas = [{
            'codigo': r['codigo'], 'campo': r['campo_experiencias']['nome'],
            'grupo_etario': r['grupo_etario'], 'texto': r['texto'],
        } for r in objetivos_ei()]
    else:
        raise ValueError(f"etapa {etapa!r} inválida; use 'EI', 'EF' ou 'EM'")
    return pd.DataFrame(linhas)

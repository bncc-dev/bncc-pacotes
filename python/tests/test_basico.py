import pytest

import bncc


def test_versao():
    v = bncc.versao()
    assert v['data_version'].startswith('dados-')
    assert len(v['checksums_sha256']) == 4


def test_case_insensitive_e_nomes_resolvidos():
    h = bncc.por_codigo('ef67lp08')
    assert h['codigo'] == 'EF67LP08'
    assert h['componente']['nome'] == 'Língua Portuguesa'
    assert h['objetos_conhecimento'][0]['nome']


def test_ei_resolve_campo():
    o = bncc.por_codigo('EI02TS01')
    assert o['campo_experiencias']['nome'] == 'Traços, sons, cores e formas'


def test_para_dataframe():
    df = bncc.para_dataframe('EF')
    assert len(df) == 1304
    assert 'codigo' in df.columns

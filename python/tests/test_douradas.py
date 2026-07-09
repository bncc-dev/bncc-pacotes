"""Paridade npm x PyPI: executa as MESMAS consultas douradas do vitest
(fixtures/consultas-douradas.json). Se um caso pedir mudança na fixture,
a divergência está no pacote, não na fixture.

As chaves esperadas vêm em camelCase (formato do pacote npm); a conversão
camel->snake aqui é mecânica e documentada.
"""
import json
import re
from pathlib import Path

import pytest

import bncc

FIXTURES = Path(__file__).parent.parent.parent / 'fixtures' / 'consultas-douradas.json'
CASOS = json.loads(FIXTURES.read_text(encoding='utf-8'))['casos']


def snake(nome):
    return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', nome).lower()


def args_em_snake(args):
    return {snake(k): v for k, v in args.items()}


@pytest.mark.parametrize('caso', CASOS, ids=[c['id'] for c in CASOS])
def test_dourada(caso):
    op, args, esperado = caso['operacao'], caso['args'], caso['esperado']

    if op == 'decodificar':
        d = bncc.decodificar(args)
        for k, v in esperado.items():
            assert d[snake(k)] == v, k
    elif op == 'decodificar_erro':
        with pytest.raises(ValueError, match=esperado):
            bncc.decodificar(args)
    elif op == 'porCodigo':
        r = bncc.por_codigo(args)
        if 'etapa' in esperado:
            assert r['etapa'] == esperado['etapa']
        if 'anos' in esperado:
            assert r['anos'] == esperado['anos']
        if 'praticaLinguagem' in esperado:
            assert r['organizacao']['nomes']['pratica_linguagem'] == esperado['praticaLinguagem']
        if esperado.get('temLocalizadorPdf'):
            assert r['fonte'].get('localizador_pdf')
        if 'competenciasNumeros' in esperado:
            assert [c['numero'] for c in r['competencias_especificas']] == esperado['competenciasNumeros']
    elif op == 'porCodigo_erro':
        with pytest.raises(ValueError, match=esperado):
            bncc.por_codigo(args)
    elif op == 'contar_habilidadesEF':
        assert len(bncc.habilidades_ef(**args_em_snake(args))) == esperado
    elif op == 'contar_uniao_anos_ef':
        uniao = set()
        for ano in args['anos']:
            uniao |= {h['codigo'] for h in bncc.habilidades_ef(componente=args['componente'], ano=ano)}
        assert len(uniao) == esperado
    elif op == 'contar_habilidadesEM':
        assert len(bncc.habilidades_em(**args_em_snake(args))) == esperado
    elif op == 'contar_objetivosEI':
        assert len(bncc.objetivos_ei(**args_em_snake(args))) == esperado
    elif op == 'contar_buscar':
        a = args_em_snake(args)
        texto = a.pop('texto')
        assert len(bncc.buscar(texto, **a)) == esperado
    elif op == 'progressaoEI_codigos':
        assert [o['codigo'] for o in bncc.progressao_ei(args)['objetivos']] == esperado
    elif op == 'estatisticas':
        assert bncc.estatisticas() == {snake(k): v for k, v in esperado.items()}
    else:
        raise AssertionError(f'operação desconhecida na fixture: {op}')

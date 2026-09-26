import pytest

import bncc


def test_versao():
    v = bncc.versao()
    assert v['data_version'].startswith('dados-')
    # O dataset pode ganhar arquivos (marcos legais, perfis, computação);
    # o que o pacote garante é o núcleo das três etapas + estrutura
    # (espelho do basico.test.ts do npm).
    nucleo = {'estrutura.json', 'educacao-infantil.json',
              'ensino-fundamental.json', 'ensino-medio.json'}
    assert nucleo <= set(v['checksums_sha256'])


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


# --- busca com ranking (issue #14, DECISOES.md D10) ---

def test_radical_tabela():
    from bncc._indice import radical
    # Tabela espelhada em packages/bncc/test/nucleo.test.ts.
    tabela = [
        ('fracao', 'frac'), ('fracoes', 'frac'), ('fracionario', 'frac'), ('fracionarias', 'frac'),
        ('texto', 'text'), ('textos', 'text'), ('contexto', 'context'),
        ('graficos', 'grafic'), ('grafica', 'grafic'), ('leitura', 'leitur'),
        ('de', 'de'), ('ler', 'ler'),
        ('conta', 'cont'), ('conto', 'cont'),  # colisão aceita
    ]
    for palavra, esperado in tabela:
        assert radical(palavra) == esperado, palavra


def test_tokenizar():
    from bncc._indice import tokenizar
    assert tokenizar('Leitura de gráficos, e textos!') == ['leitur', 'grafic', 'text']
    assert tokenizar('de a o') == []


def test_buscar_so_stopwords_vazio():
    assert bncc.buscar('de') == []
    assert bncc.buscar('a de em') == []


def test_buscar_pontuacao_decrescente_e_sem_substring():
    r = bncc.buscar('texto')
    assert len(r) > 100
    for a, b in zip(r, r[1:]):
        assert a['pontuacao'] > b['pontuacao'] or (a['pontuacao'] == b['pontuacao'] and a['codigo'] < b['codigo'])
    # Registros que só têm 'contexto' (substring) ficam fora; na 0.4.0 entravam (394 no total).
    cods = {x['codigo'] for x in r}
    assert not cods & {'EI02ET07', 'EI03EF04', 'EF15LP13', 'EF35LP10', 'EF04LP03'}
    assert len(r) < 394


def test_buscar_radical_mesmo_conjunto():
    cods = lambda t: [x['codigo'] for x in bncc.buscar(t)]
    assert cods('fração') == cods('frações') == cods('fracionário')


def test_buscar_literal_e_enunciado_completo():
    assert [x['codigo'] for x in bncc.buscar('velocidades ritmos')] == ['EI01ET06']
    completo = bncc.buscar('Identificar a adequação de diferentes tecnologias computacionais na resolução de problemas.')
    assert [x['codigo'] for x in completo] == ['EF05CO11']


def test_buscar_parcial_ultima_passada():
    assert [x['codigo'] for x in bncc.buscar('brincadeiras de roda')] == ['EF12EF11']


def test_buscar_enunciado_identico_primeiro():
    texto = bncc.por_codigo('EF08HI06')['texto']
    assert [x['codigo'] for x in bncc.buscar(texto)[:2]] == ['EF08HI06', 'EF08GE05']


def test_ranquear_sobre_indice_serializado_reproduz_buscar():
    import json
    from pathlib import Path
    from bncc._busca import preparar_indice, ranquear
    fixture = json.loads((Path(__file__).parents[2] / 'fixtures' / 'consultas-douradas.json').read_text(encoding='utf-8'))
    casos = fixture if isinstance(fixture, list) else fixture['casos']
    consultas = {c['args']['texto'] for c in casos if 'buscar' in c['operacao']}
    consultas |= {'fração', 'texto', 'de', 'leitura de gráficos', 'brincadeiras de roda'}
    entradas = json.loads(json.dumps(bncc.indice_busca()))  # ida e volta, como no navegador
    indice = preparar_indice(entradas)
    for q in sorted(consultas):
        via_indice = [f"{entradas[p['i']]['codigo']}:{p['pontuacao']}" for p in ranquear(indice, q)]
        via_buscar = [f"{r['codigo']}:{r['pontuacao']}" for r in bncc.buscar(q)]
        assert via_indice == via_buscar, q

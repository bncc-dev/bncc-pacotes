"""Busca com ranking, sem dados: espelho de `packages/bncc/src/busca.ts` (DECISOES.md D10).

`buscar()` usa exatamente estas funções sobre o índice que monta dos dados.
Com `indice_busca()` serializado, `preparar_indice` e `ranquear` reproduzem a
mesma ordem e a mesma pontuação fora do pacote.
"""
import math

from ._indice import normalizar_busca, tokenizar

# Parâmetros do BM25 (DECISOES.md D10). Os mesmos no pacote npm.
_BM25_K1 = 1.2
_BM25_B = 0.75
_PESO_CAMPOS = 0.5


def _separar(radicais):
    return radicais.split(' ') if radicais else []


def _contar(tokens):
    m = {}
    for t in tokens:
        m[t] = m.get(t, 0) + 1
    return m


def preparar_indice(entradas):
    """Prepara entradas {codigo, texto, k, kc} (forma de `indice_busca()`) para `ranquear`.

    A ordem das entradas é a ordem das posições `i` devolvidas por `ranquear`.
    """
    docs, df, soma = [], {}, 0
    for e in entradas:
        te = _separar(e['k'])
        tc = _separar(e['kc'])
        doc = {'codigo': e['codigo'], 'texto_norm': normalizar_busca(e['texto']),
               'enunciado': _contar(te), 'campos': _contar(tc), 'tamanho': len(te) + len(tc)}
        soma += doc['tamanho']
        for t in set(te + tc):
            df[t] = df.get(t, 0) + 1
        docs.append(doc)
    return {'docs': docs, 'df': df, 'tamanho_medio': soma / len(docs) if docs else 0}


def ranquear(indice_preparado, consulta, aceitar=None):
    """Ranking determinístico (issue #14): lista de {'i', 'pontuacao'} em ordem de relevância.

    Estratos: enunciado idêntico à consulta; todos os radicais e o trecho literal;
    todos os radicais; parte dos radicais, só quando os anteriores estão vazios.
    Dentro de cada estrato, pontuação decrescente e empate por código. `aceitar(i)`
    filtra entradas pela posição sem mudar a pontuação das demais.
    """
    alvo = normalizar_busca(consulta)
    termos = list(dict.fromkeys(tokenizar(consulta)))
    if not termos:
        return []
    docs = indice_preparado['docs']
    df, tamanho_medio = indice_preparado['df'], indice_preparado['tamanho_medio']
    n = len(docs)
    pontuados = []
    for i, doc in enumerate(docs):
        if aceitar is not None and not aceitar(i):
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
        pontuados.append({'i': i, 'codigo': doc['codigo'], 'casados': casados,
                          'exato': exato, 'literal': literal, 'pontuacao': round(s * 1000) / 1000})
    chave = lambda p: (-p['pontuacao'], p['codigo'])
    todos = [p for p in pontuados if p['casados'] == len(termos)]
    if todos:
        escolhidos = (sorted([p for p in todos if p['exato']], key=chave)
                      + sorted([p for p in todos if p['literal'] and not p['exato']], key=chave)
                      + sorted([p for p in todos if not p['literal'] and not p['exato']], key=chave))
    else:
        escolhidos = sorted(pontuados, key=chave)
    return [{'i': p['i'], 'pontuacao': p['pontuacao']} for p in escolhidos]

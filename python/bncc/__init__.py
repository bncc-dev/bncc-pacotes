"""bncc — a BNCC (Base Nacional Comum Curricular) como dados estruturados e
verificados, com API de consulta em português.

Dados embutidos, zero dependências, zero rede. Cada registro é rastreável à
fonte oficial. Projeto bncc.dev · dados CC BY 4.0 · código MIT.
"""
from ._codigos import decodificar
from ._consultas import (
    buscar, estatisticas, estrutura, habilidades_ef, habilidades_em,
    objetivos_ei, por_codigo, progressao_ei, versao,
)
from ._pandas import para_dataframe

__all__ = [
    'buscar', 'decodificar', 'estatisticas', 'estrutura', 'habilidades_ef',
    'habilidades_em', 'objetivos_ei', 'para_dataframe', 'por_codigo',
    'progressao_ei', 'versao',
]

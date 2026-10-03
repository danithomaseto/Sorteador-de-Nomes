"""Normalização de nomes de participantes.

Implementação única, usada por todas as fontes (digitação, texto colado, CSV, XLSX) e também
para o nome do sorteio. Regras:

* qualquer espaço (inclusive tab, quebra de linha e espaço não separável) vira um espaço simples;
  espaços repetidos e nas pontas são removidos;
* caracteres de controle e invisíveis são removidos — eles podem esconder diferenças entre nomes
  ou inverter a direção do texto na tela;
* o resultado fica em Unicode NFC: um "João" digitado no macOS pode chegar decomposto;
* capitalização e acentos são preservados — nunca "corrigimos" nomes.

A chave de duplicidade (:func:`match_key`) ignora maiúsculas, acentos, espaços extras e
variações de compatibilidade Unicode: "JOÃO  silva" e "joao silva" têm a mesma chave.
"""

import re
import unicodedata
from enum import StrEnum

from app.domain.errors import AppError

MAX_NAME_LENGTH = 120
MAX_DRAW_NAME_LENGTH = 100
MAX_MATCH_KEY_LENGTH = 255

# Faixas de caracteres removidos (código Unicode inicial e final, inclusivos):
# controles que não são espaço (tab, quebras de linha e afins viram espaço), invisíveis que podem
# esconder diferenças entre nomes ou inverter a direção do texto, surrogates soltos (decodificação
# inválida) e uso privado (aparecem como caixas vazias). Mantemos ZWJ/ZWNJ (U+200C/U+200D), usados
# em emojis compostos e em algumas escritas.
_REMOVED_RANGES = (
    (0x0000, 0x0008),  # controles C0
    (0x000E, 0x001B),  # controles C0 (U+001C–U+001F são separadores tratados como espaço)
    (0x007F, 0x0084),  # DEL e controles C1
    (0x0086, 0x009F),  # controles C1 (U+0085 é quebra de linha, tratada como espaço)
    (0x00AD, 0x00AD),  # hífen condicional
    (0x180E, 0x180E),  # separador de vogal mongol
    (0x200B, 0x200B),  # espaço de largura zero
    (0x200E, 0x200F),  # marcas de direção do texto
    (0x202A, 0x202E),  # incorporações e substituições bidirecionais
    (0x2060, 0x2064),  # word joiner e operadores invisíveis
    (0x2066, 0x2069),  # isolamentos bidirecionais
    (0xD800, 0xDFFF),  # surrogates
    (0xE000, 0xF8FF),  # uso privado (BMP)
    (0xFEFF, 0xFEFF),  # BOM / espaço não separável de largura zero
    (0xF0000, 0x10FFFF),  # uso privado suplementar (planos 15 e 16)
)
# O padrão usa escapes do próprio módulo ``re`` (``\\Uxxxxxxxx``): nenhum caractere invisível
# aparece no código-fonte. A substituição roda em C, rápida para listas com 50 mil nomes.
_REMOVED = re.compile(
    "[" + "".join(f"\\U{first:08x}-\\U{last:08x}" for first, last in _REMOVED_RANGES) + "]"
)
# Marcas combinantes (acentos decompostos) do plano básico, removidas da chave de duplicidade.
_COMBINING_MARKS = {
    code_point: None for code_point in range(0x10000) if unicodedata.combining(chr(code_point))
}


class NameProblem(StrEnum):
    EMPTY = "empty"
    TOO_LONG = "too_long"


class InvalidNameError(AppError):
    code = "invalid_name"
    title = "Nome inválido"


def normalize_name(raw: str) -> str:
    """Normaliza um nome sem validá-lo (pode devolver texto vazio ou longo demais)."""
    collapsed = " ".join(_REMOVED.sub("", raw).split())
    if unicodedata.is_normalized("NFC", collapsed):
        return collapsed
    return unicodedata.normalize("NFC", collapsed)


def name_problem(name: str, max_length: int = MAX_NAME_LENGTH) -> NameProblem | None:
    """Verifica um nome já normalizado."""
    if not name:
        return NameProblem.EMPTY
    if len(name) > max_length:
        return NameProblem.TOO_LONG
    return None


def clean_name(raw: str, max_length: int = MAX_NAME_LENGTH) -> str:
    """Normaliza e valida; usado onde um nome inválido deve interromper a operação."""
    name = normalize_name(raw)
    problem = name_problem(name, max_length)
    if problem is NameProblem.EMPTY:
        raise InvalidNameError("O nome não pode ficar vazio.", reason=problem.value)
    if problem is NameProblem.TOO_LONG:
        raise InvalidNameError(
            f"O nome pode ter no máximo {max_length} caracteres.",
            reason=problem.value,
            max_length=max_length,
        )
    return name


def match_key(name: str) -> str:
    """Chave para detectar possíveis duplicados; nunca é exibida ao usuário."""
    if name.isascii():
        key = name.lower()
    else:
        decomposed = unicodedata.normalize("NFKD", name.casefold())
        key = decomposed.translate(_COMBINING_MARKS).casefold()
    return " ".join(key.split())[:MAX_MATCH_KEY_LENGTH]

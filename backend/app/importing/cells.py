"""Conversão de células (XLSX/CSV) em texto, preservando o que é útil para o usuário.

Números viram texto sem ".0" (bilhetes numerados são participantes válidos); datas viram
dd/mm/aaaa e são sinalizadas, porque quase sempre indicam que a coluna escolhida não é a de nomes.
"""

import re
from datetime import date, datetime, time, timedelta
from enum import StrEnum

type CellValue = str | int | float | bool | datetime | date | time | timedelta | None

EXCEL_ERRORS = frozenset(
    {
        "#NULL!",
        "#DIV/0!",
        "#VALUE!",
        "#REF!",
        "#NAME?",
        "#NUM!",
        "#N/A",
        "#GETTING_DATA",
        "#SPILL!",
        "#CALC!",
        "#FIELD!",
        "#BLOCKED!",
        "#CONNECT!",
        "#BUSY!",
        "#UNKNOWN!",
    }
)

_NUMERIC_TEXT = re.compile(r"^[+-]?\d+(?:[.,]\d+)*$")


class CellKind(StrEnum):
    EMPTY = "empty"
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    ERROR = "error"


def cell_text(value: CellValue) -> tuple[str, CellKind]:
    if value is None:
        return "", CellKind.EMPTY
    if isinstance(value, str):
        return _text_cell(value)
    if isinstance(value, bool):  # antes de int: bool é subclasse de int
        return ("Verdadeiro" if value else "Falso"), CellKind.TEXT
    if isinstance(value, int):
        return str(value), CellKind.NUMBER
    if isinstance(value, float):
        return (str(int(value)) if value.is_integer() else str(value)), CellKind.NUMBER
    return _temporal_text(value), CellKind.DATE


def _text_cell(value: str) -> tuple[str, CellKind]:
    stripped = value.strip()
    if not stripped:
        return "", CellKind.EMPTY
    if stripped in EXCEL_ERRORS:
        return stripped, CellKind.ERROR
    if _NUMERIC_TEXT.match(stripped):
        return value, CellKind.NUMBER
    return value, CellKind.TEXT


def _temporal_text(value: datetime | date | time | timedelta) -> str:
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y" if value.time() == time() else "%d/%m/%Y %H:%M")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, time):
        return value.strftime("%H:%M")
    return str(value)


def is_name_like(value: CellValue) -> bool:
    """Texto com pelo menos uma letra: o tipo de valor esperado numa coluna de nomes."""
    text, kind = cell_text(value)
    return kind is CellKind.TEXT and any(character.isalpha() for character in text)

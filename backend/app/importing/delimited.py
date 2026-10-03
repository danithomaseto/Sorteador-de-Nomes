"""Leitura de texto delimitado (CSV, TSV e colunas coladas de uma planilha)."""

import codecs
import csv
from collections import Counter
from typing import Literal

from app.importing.cells import CellValue
from app.importing.errors import InvalidTextFileError, TooManyRowsError
from app.importing.limits import ImportLimits

type DelimiterName = Literal["semicolon", "comma", "tab", "none"]
type DelimiterOption = Literal["auto", "semicolon", "comma", "tab", "none"]

DELIMITERS: dict[DelimiterName, str | None] = {
    "semicolon": ";",
    "comma": ",",
    "tab": "\t",
    "none": None,
}
# Ordem de preferência na detecção: ";" é o padrão do Excel em português (a vírgula é o
# separador decimal), então vem primeiro.
_DETECTION_ORDER: tuple[DelimiterName, ...] = ("semicolon", "tab", "comma")
_SAMPLE_LINES = 50
_CONSISTENCY = 0.8


def decode_text(data: bytes) -> str:
    """Decodifica UTF-8 (com ou sem BOM), UTF-16 com BOM ou Windows-1252."""
    try:
        if data.startswith(codecs.BOM_UTF8):
            return data[len(codecs.BOM_UTF8) :].decode("utf-8")
        if data.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)):
            return data.decode("utf-16")
    except UnicodeDecodeError as exc:
        raise InvalidTextFileError from exc
    if b"\x00" in data:
        raise InvalidTextFileError  # conteúdo binário
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        # Exportações do Excel no Windows costumam usar Windows-1252.
        return data.decode("cp1252", errors="replace")


def detect_delimiter(text: str) -> DelimiterName:
    """Escolhe o delimitador que produz o mesmo número de colunas (> 1) na maioria das linhas."""
    sample = [line for line in text.splitlines() if line.strip()][:_SAMPLE_LINES]
    if not sample:
        return "none"
    for name in _DETECTION_ORDER:
        delimiter = DELIMITERS[name] or ""
        try:
            widths = [len(row) for row in csv.reader(sample, delimiter=delimiter)]
        except csv.Error:
            continue
        most_common_width, occurrences = Counter(widths).most_common(1)[0]
        if most_common_width > 1 and occurrences / len(widths) >= _CONSISTENCY:
            return name
    return "none"


def parse_delimited(
    text: str, delimiter: DelimiterName, limits: ImportLimits
) -> list[tuple[CellValue, ...]]:
    """Linhas do arquivo como tuplas de texto; índice da lista + 1 = número da linha."""
    lines = text.splitlines()
    separator = DELIMITERS[delimiter]
    if separator is None:
        rows: list[tuple[CellValue, ...]] = [(line,) for line in lines]
    else:
        try:
            rows = [
                tuple(row[: limits.max_columns]) for row in csv.reader(lines, delimiter=separator)
            ]
        except csv.Error as exc:
            raise InvalidTextFileError from exc
    non_empty = sum(1 for row in rows if any(isinstance(c, str) and c.strip() for c in row))
    if non_empty > limits.max_rows + 1:  # +1: a primeira linha pode ser cabeçalho
        raise TooManyRowsError(limits.max_rows)
    return rows

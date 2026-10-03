"""Importação: transforma texto, CSV e XLSX em participantes válidos, apenas em memória.

Ponto de entrada para a camada de serviços: :func:`preview_text` e :func:`preview_file`.
Nada é gravado: o resultado é uma pré-visualização que o usuário confirma no navegador.
"""

from dataclasses import replace
from typing import Literal

from app.importing.delimited import (
    DelimiterOption,
    decode_text,
    detect_delimiter,
    parse_delimited,
)
from app.importing.errors import (
    EmptyFileError,
    FileTooLargeError,
    InvalidSpreadsheetError,
    LegacyOrProtectedSpreadsheetError,
    TextTooLongError,
    TooManyRowsError,
    UnsupportedFileTypeError,
)
from app.importing.limits import ImportLimits
from app.importing.preview import HeaderOption, Preview, preview_items, preview_table
from app.importing.text import SeparatorOption, looks_tabular, resolve_separator, split_text
from app.importing.xlsx_reader import CFB_SIGNATURE, ZIP_SIGNATURE, read_workbook

type FileFormat = Literal["xlsx", "csv"]

# Formatos binários comuns enviados por engano recebem "formato não suportado".
_OTHER_BINARY_SIGNATURES = (b"%PDF-", b"\x89PNG", b"\xff\xd8\xff", b"GIF8", b"Rar!", b"7z\xbc\xaf")

__all__ = ["FileFormat", "ImportLimits", "Preview", "preview_file", "preview_text"]


def preview_text(
    text: str,
    *,
    separator: SeparatorOption,
    header: HeaderOption,
    column: int | None,
    limits: ImportLimits,
) -> Preview:
    if len(text) > limits.max_text_chars:
        raise TextTooLongError(limits.max_text_chars)
    if separator == "auto" and looks_tabular(text):
        rows = parse_delimited(text, "tab", limits)
        table = preview_table(
            rows, source="text", header=header, column=column, max_columns=limits.max_columns
        )
        return replace(table, separator="tab")
    resolved = resolve_separator(text, separator)
    items = split_text(text, resolved)
    if sum(1 for _, value in items if value.strip()) > limits.max_rows:
        raise TooManyRowsError(limits.max_rows)
    return preview_items(items, separator=resolved)


def preview_file(
    data: bytes,
    *,
    file_format: FileFormat | None,
    sheet: int | None,
    header: HeaderOption,
    column: int | None,
    delimiter: DelimiterOption,
    limits: ImportLimits,
) -> Preview:
    if not data:
        raise EmptyFileError
    if len(data) > limits.max_bytes:
        raise FileTooLargeError(limits.max_bytes)

    if detect_format(data, file_format) == "xlsx":
        workbook = read_workbook(data, limits, sheet)
        table = preview_table(
            workbook.rows,
            source="xlsx",
            header=header,
            column=column,
            max_columns=limits.max_columns,
        )
        return replace(table, sheets=workbook.sheets, sheet=workbook.selected)

    text = decode_text(data)
    resolved = detect_delimiter(text) if delimiter == "auto" else delimiter
    rows = parse_delimited(text, resolved, limits)
    table = preview_table(
        rows, source="csv", header=header, column=column, max_columns=limits.max_columns
    )
    return replace(table, separator=resolved)


def detect_format(data: bytes, declared: FileFormat | None) -> FileFormat:
    """O conteúdo decide o formato; a extensão informada pelo navegador é só uma pista."""
    if data.startswith(ZIP_SIGNATURE):
        return "xlsx"
    if data.startswith(CFB_SIGNATURE):
        raise LegacyOrProtectedSpreadsheetError
    if data.startswith(_OTHER_BINARY_SIGNATURES):
        raise UnsupportedFileTypeError
    if declared == "xlsx":
        raise InvalidSpreadsheetError
    return "csv"

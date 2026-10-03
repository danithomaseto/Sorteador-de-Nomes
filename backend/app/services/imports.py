"""Casos de uso de importação: delegam ao pacote ``importing`` com os limites configurados."""

from app.core.config import Settings
from app.importing import FileFormat, ImportLimits, Preview, preview_file, preview_text
from app.importing.delimited import DelimiterOption
from app.importing.preview import HeaderOption
from app.importing.text import SeparatorOption


def import_limits(settings: Settings) -> ImportLimits:
    return ImportLimits(
        max_bytes=settings.max_upload_bytes,
        max_uncompressed_bytes=settings.max_uncompressed_bytes,
        max_rows=settings.max_participants,
        max_text_chars=settings.max_text_chars,
    )


def parse_text(
    text: str,
    *,
    separator: SeparatorOption,
    header: HeaderOption,
    column: int | None,
    settings: Settings,
) -> Preview:
    return preview_text(
        text, separator=separator, header=header, column=column, limits=import_limits(settings)
    )


def parse_file(
    data: bytes,
    *,
    file_format: FileFormat | None,
    sheet: int | None,
    header: HeaderOption,
    column: int | None,
    delimiter: DelimiterOption,
    settings: Settings,
) -> Preview:
    return preview_file(
        data,
        file_format=file_format,
        sheet=sheet,
        header=header,
        column=column,
        delimiter=delimiter,
        limits=import_limits(settings),
    )

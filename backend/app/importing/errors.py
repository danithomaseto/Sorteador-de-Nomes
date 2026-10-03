"""Erros de importação. As mensagens dizem o que aconteceu e como resolver, sem detalhes técnicos
e sem repetir conteúdo do arquivo."""

from app.domain.errors import AppError

MEGABYTE = 1024 * 1024


class ImportFailedError(AppError):
    code = "import_failed"
    title = "Não foi possível importar"


class EmptyFileError(ImportFailedError):
    code = "empty_file"
    title = "Arquivo vazio"

    def __init__(self) -> None:
        super().__init__("O arquivo está vazio. Escolha outro arquivo.")


class FileTooLargeError(ImportFailedError):
    code = "file_too_large"
    title = "Arquivo grande demais"

    def __init__(self, max_bytes: int) -> None:
        limit_mb = max_bytes / MEGABYTE
        super().__init__(
            f"O arquivo passa do limite de {limit_mb:g} MB. Remova colunas ou abas que não "
            "sejam necessárias, ou divida a lista.",
            max_bytes=max_bytes,
        )


class SpreadsheetTooLargeError(ImportFailedError):
    code = "spreadsheet_too_large"
    title = "Planilha grande demais"

    def __init__(self) -> None:
        super().__init__(
            "A planilha é grande demais para importar. Remova abas, colunas ou formatações "
            "que não sejam necessárias e tente novamente."
        )


class UnsupportedFileTypeError(ImportFailedError):
    code = "unsupported_file_type"
    title = "Formato não suportado"

    def __init__(self) -> None:
        super().__init__(
            "Envie uma planilha do Excel (.xlsx) ou um arquivo .csv. Se a planilha foi criada em "
            "outro programa, use “Salvar como” e escolha o formato .xlsx."
        )


class LegacyOrProtectedSpreadsheetError(ImportFailedError):
    code = "legacy_or_protected_spreadsheet"
    title = "Planilha antiga ou protegida"

    def __init__(self) -> None:
        super().__init__(
            "Este arquivo parece ser uma planilha .xls antiga ou protegida por senha. Abra no "
            "Excel, remova a senha, se houver, e salve como .xlsx."
        )


class InvalidSpreadsheetError(ImportFailedError):
    code = "invalid_spreadsheet"
    title = "Planilha inválida"

    def __init__(self) -> None:
        super().__init__(
            "Não foi possível ler a planilha. Verifique se o arquivo é um .xlsx válido e se ele "
            "abre normalmente no Excel."
        )


class InvalidTextFileError(ImportFailedError):
    code = "invalid_text_file"
    title = "Arquivo de texto inválido"

    def __init__(self) -> None:
        super().__init__(
            "Não foi possível ler o arquivo como texto. Verifique se ele é um .csv válido."
        )


class TooManyRowsError(ImportFailedError):
    code = "too_many_rows"
    title = "Linhas demais"

    def __init__(self, max_rows: int) -> None:
        super().__init__(
            f"A lista tem mais de {max_rows:,} linhas com dados (limite por sorteio). Divida a "
            "lista ou remova linhas que não são participantes.".replace(",", "."),
            max_rows=max_rows,
        )


class TextTooLongError(ImportFailedError):
    code = "text_too_long"
    title = "Texto longo demais"

    def __init__(self, max_chars: int) -> None:
        super().__init__(
            "O texto colado é longo demais. Divida a lista em partes menores.",
            max_chars=max_chars,
        )


class SheetNotFoundError(ImportFailedError):
    code = "sheet_not_found"
    title = "Aba não encontrada"

    def __init__(self, sheet: int) -> None:
        super().__init__("A aba escolhida não existe nesta planilha.", sheet=sheet)


class ColumnNotFoundError(ImportFailedError):
    code = "column_not_found"
    title = "Coluna não encontrada"

    def __init__(self, column: int) -> None:
        super().__init__("A coluna escolhida não existe neste arquivo.", column=column)

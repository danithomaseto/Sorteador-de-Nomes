"""Importação de CSV e XLSX: arquivos válidos, inválidos e maliciosos."""

import codecs
from dataclasses import replace
from datetime import date, datetime

import pytest

from app.importing import FileFormat, preview_file
from app.importing.delimited import DelimiterOption
from app.importing.errors import (
    ColumnNotFoundError,
    EmptyFileError,
    FileTooLargeError,
    InvalidSpreadsheetError,
    InvalidTextFileError,
    LegacyOrProtectedSpreadsheetError,
    SheetNotFoundError,
    SpreadsheetTooLargeError,
    TooManyRowsError,
    UnsupportedFileTypeError,
)
from app.importing.limits import ImportLimits
from app.importing.preview import HeaderOption, IssueCode, Preview
from app.importing.xlsx_reader import CFB_SIGNATURE
from tests.helpers import DEFAULT_LIMITS, make_xlsx, make_zip


def load(
    data: bytes,
    file_format: FileFormat | None = None,
    *,
    sheet: int | None = None,
    header: HeaderOption = "auto",
    column: int | None = None,
    delimiter: DelimiterOption = "auto",
    limits: ImportLimits = DEFAULT_LIMITS,
) -> Preview:
    return preview_file(
        data,
        file_format=file_format,
        sheet=sheet,
        header=header,
        column=column,
        delimiter=delimiter,
        limits=limits,
    )


def names(preview: Preview) -> list[str]:
    return [entry.name for entry in preview.entries]


class TestCsv:
    def test_utf8_com_bom_e_ponto_e_virgula(self) -> None:
        data = codecs.BOM_UTF8 + "Nome;Matrícula\nJoão Silva;123\nMaria Souza;456\n".encode()
        preview = load(data, "csv")
        assert preview.source == "csv"
        assert preview.separator == "semicolon"
        assert preview.has_header is True
        assert names(preview) == ["João Silva", "Maria Souza"]
        assert [entry.row for entry in preview.entries] == [2, 3]

    def test_windows_1252(self) -> None:
        data = "Nome\nJoão\nConceição\n".encode("cp1252")
        assert names(load(data, "csv")) == ["João", "Conceição"]

    def test_utf16_com_bom(self) -> None:
        data = "Nome\tÁrea\nAna\tRH\n".encode("utf-16")
        preview = load(data, "csv")
        assert preview.separator == "tab"
        assert names(preview) == ["Ana"]

    def test_virgula_com_aspas(self) -> None:
        data = b'Nome,Cidade\n"Silva, Joao",Recife\n"Souza, Ana",Natal\n'
        preview = load(data, "csv")
        assert preview.separator == "comma"
        assert names(preview) == ["Silva, Joao", "Souza, Ana"]

    def test_uma_coluna_sem_delimitador(self) -> None:
        preview = load(b"Ana\nBia\nCaio\n", "csv")
        assert preview.separator == "none"
        assert preview.has_header is False
        assert names(preview) == ["Ana", "Bia", "Caio"]

    def test_usuario_forca_uma_coluna(self) -> None:
        preview = load(b"Silva, Joao\nSouza, Ana\n", "csv", delimiter="none")
        assert names(preview) == ["Silva, Joao", "Souza, Ana"]

    def test_conteudo_binario_e_recusado(self) -> None:
        with pytest.raises(InvalidTextFileError):
            load(b"Ana\x00\x01\x02", "csv")

    def test_pdf_com_extensao_errada(self) -> None:
        with pytest.raises(UnsupportedFileTypeError):
            load(b"%PDF-1.7\n...", "csv")


class TestXlsx:
    def test_planilha_com_cabecalho_e_varias_colunas(self) -> None:
        data = make_xlsx(
            [
                ["Nome", "Matrícula", "Área"],
                ["João Silva", 123, "Operações"],
                ["Maria Souza", 456, "RH"],
                ["Carlos Lima", 789, "TI"],
            ]
        )
        preview = load(data, "xlsx")
        assert preview.source == "xlsx"
        assert preview.has_header is True
        assert preview.column == 0
        assert [c.label for c in preview.columns] == ["Nome", "Matrícula", "Área"]
        assert [c.letter for c in preview.columns] == ["A", "B", "C"]
        assert preview.columns[1].samples == ("123", "456", "789")
        assert names(preview) == ["João Silva", "Maria Souza", "Carlos Lima"]
        assert [s.name for s in preview.sheets] == ["Plan1"]

    def test_escolher_outra_coluna(self) -> None:
        data = make_xlsx([["Nome", "Matrícula"], ["Ana", 10], ["Bia", 20.0]])
        preview = load(data, "xlsx", column=1)
        assert names(preview) == ["10", "20"]

    def test_sem_cabecalho_escolhe_a_coluna_com_nomes(self) -> None:
        data = make_xlsx([[1, "Ana Lima", "x"], [2, "Bia Souza", "y"], [3, "Caio Reis", ""]])
        preview = load(data, "xlsx")
        assert preview.has_header is False
        assert preview.column == 1
        assert names(preview) == ["Ana Lima", "Bia Souza", "Caio Reis"]

    def test_cabecalho_desconhecido_sobre_numeros(self) -> None:
        data = make_xlsx([["Inscrição", "Pessoa inscrita"], [1, "Ana"], [2, "Bia"]])
        preview = load(data, "xlsx")
        assert preview.has_header is True
        assert preview.column == 1

    def test_usuario_define_que_nao_ha_cabecalho(self) -> None:
        data = make_xlsx([["Nome"], ["Ana"]])
        assert names(load(data, "xlsx", header="no")) == ["Nome", "Ana"]

    def test_linhas_e_celulas_vazias(self) -> None:
        data = make_xlsx([["Nome"], ["Ana"], [None], [""], ["   "], ["Bia"]])
        preview = load(data, "xlsx")
        assert names(preview) == ["Ana", "Bia"]
        assert preview.stats.empty == 3
        assert [entry.row for entry in preview.entries] == [2, 6]

    def test_espacos_acentos_e_caracteres_especiais(self) -> None:
        data = make_xlsx([["Nome"], ["  Zoë   D'Ávila  "], ["Ñandú-Øster"], ["李小龍"]])
        assert names(load(data, "xlsx")) == ["Zoë D'Ávila", "Ñandú-Øster", "李小龍"]

    def test_duplicados_sao_sinalizados(self) -> None:
        data = make_xlsx([["Nome"], ["João Silva"], ["João Silva"], ["Ana"]])
        preview = load(data, "xlsx")
        assert len(preview.entries) == 3
        assert preview.stats.duplicates == 1
        assert preview.entries[1].repeat_of == 2

    def test_datas_sao_aceitas_e_contadas(self) -> None:
        data = make_xlsx([["Nome"], [date(2026, 10, 3)], [datetime(2026, 10, 3, 18, 35)]])  # noqa: DTZ001 (o Excel não guarda fuso)
        preview = load(data, "xlsx")
        assert names(preview) == ["03/10/2026", "03/10/2026 18:35"]
        assert preview.stats.dates == 2

    def test_erros_de_celula_viram_problemas(self) -> None:
        data = make_xlsx([["Nome"], ["#N/A"], ["Ana"]])
        preview = load(data, "xlsx")
        assert names(preview) == ["Ana"]
        assert preview.issues[0].code is IssueCode.CELL_ERROR

    def test_formula_sem_valor_calculado_conta_como_vazia(self) -> None:
        data = make_xlsx([["Nome"], ["=A3"], ["Ana"]])
        preview = load(data, "xlsx")
        assert names(preview) == ["Ana"]
        assert preview.stats.empty == 1

    def test_celulas_mescladas_usam_o_primeiro_valor(self) -> None:
        data = make_xlsx([["Nome", "Extra"], ["Ana", "x"], ["Bia", "y"]], merge="A2:B2")
        assert names(load(data, "xlsx")) == ["Ana", "Bia"]

    def test_escolhe_a_primeira_aba_visivel_com_dados(self) -> None:
        data = make_xlsx(
            sheets={"Vazia": [], "Oculta": [["Nome"], ["X"]], "Lista": [["Nome"], ["Ana"]]},
            hidden=frozenset({"Oculta"}),
        )
        preview = load(data, "xlsx")
        assert preview.sheet == 2
        assert [(s.name, s.hidden) for s in preview.sheets] == [
            ("Vazia", False),
            ("Oculta", True),
            ("Lista", False),
        ]
        assert names(preview) == ["Ana"]

    def test_escolher_aba(self) -> None:
        data = make_xlsx(sheets={"A": [["Nome"], ["Ana"]], "B": [["Nome"], ["Bia"]]})
        assert names(load(data, "xlsx", sheet=1)) == ["Bia"]

    def test_aba_vazia_nao_e_erro(self) -> None:
        data = make_xlsx(sheets={"A": [["Nome"], ["Ana"]], "B": []})
        preview = load(data, "xlsx", sheet=1)
        assert preview.entries == ()
        assert len(preview.sheets) == 2

    def test_aba_inexistente(self) -> None:
        with pytest.raises(SheetNotFoundError):
            load(make_xlsx([["Ana"]]), "xlsx", sheet=3)

    def test_coluna_inexistente(self) -> None:
        with pytest.raises(ColumnNotFoundError):
            load(make_xlsx([["Ana"]]), "xlsx", column=5)

    def test_extensao_csv_mas_conteudo_xlsx(self) -> None:
        assert names(load(make_xlsx([["Nome"], ["Ana"]]), "csv")) == ["Ana"]


class TestArquivosInvalidos:
    def test_arquivo_vazio(self) -> None:
        with pytest.raises(EmptyFileError):
            load(b"", "xlsx")

    def test_arquivo_grande_demais(self) -> None:
        limits = replace(DEFAULT_LIMITS, max_bytes=1024)
        with pytest.raises(FileTooLargeError):
            load(b"x" * 1025, "csv", limits=limits)

    def test_xls_antigo_ou_protegido(self) -> None:
        with pytest.raises(LegacyOrProtectedSpreadsheetError):
            load(CFB_SIGNATURE + b"\x00" * 512, "xlsx")

    def test_texto_com_extensao_xlsx(self) -> None:
        with pytest.raises(InvalidSpreadsheetError):
            load(b"Nome\nAna\n", "xlsx")

    def test_zip_que_nao_e_planilha(self) -> None:
        data = make_zip({"word/document.xml": b"<w/>", "[Content_Types].xml": b"<x/>"})
        with pytest.raises(UnsupportedFileTypeError):
            load(data, "xlsx")

    def test_zip_corrompido(self) -> None:
        with pytest.raises(InvalidSpreadsheetError):
            load(b"PK\x03\x04" + b"lixo" * 100, "xlsx")

    def test_estrutura_valida_com_xml_quebrado(self) -> None:
        data = make_zip(
            {"[Content_Types].xml": b"<Types", "xl/workbook.xml": b"<workbook><sheets>"}
        )
        with pytest.raises(InvalidSpreadsheetError):
            load(data, "xlsx")

    def test_zip_bomb_e_recusada_pelo_tamanho_descompactado(self) -> None:
        data = make_zip(
            {
                "[Content_Types].xml": b"<Types/>",
                "xl/workbook.xml": b"<workbook/>",
                "xl/worksheets/sheet1.xml": b"\x00" * (3 * 1024 * 1024),
            }
        )
        assert len(data) < 20_000
        limits = replace(DEFAULT_LIMITS, max_uncompressed_bytes=1024 * 1024)
        with pytest.raises(SpreadsheetTooLargeError):
            load(data, "xlsx", limits=limits)

    def test_linhas_demais(self) -> None:
        data = make_xlsx([["Nome"]] + [[f"P{i}"] for i in range(10)])
        limits = replace(DEFAULT_LIMITS, max_rows=5)
        with pytest.raises(TooManyRowsError):
            load(data, "xlsx", limits=limits)

    def test_csv_com_linhas_demais(self) -> None:
        limits = replace(DEFAULT_LIMITS, max_rows=2)
        with pytest.raises(TooManyRowsError):
            load(b"a\nb\nc\nd\n", "csv", limits=limits)

    def test_para_de_ler_depois_de_muitas_linhas_vazias(self) -> None:
        rows: list[list[object]] = [["Nome"], ["Ana"]]
        rows.extend([None] for _ in range(30))
        rows.append(["Perdido"])
        rows[10] = [""]
        limits = replace(DEFAULT_LIMITS, max_blank_streak=20)
        preview = load(make_xlsx(rows), "xlsx", limits=limits)
        assert names(preview) == ["Ana"]

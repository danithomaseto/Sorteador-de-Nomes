import codecs
from dataclasses import replace
from datetime import date, datetime, time, timedelta

import pytest

from app.importing.cells import CellKind, cell_text, is_name_like
from app.importing.delimited import decode_text, detect_delimiter, parse_delimited
from app.importing.errors import InvalidTextFileError
from tests.helpers import DEFAULT_LIMITS


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, ("", CellKind.EMPTY)),
        ("  ", ("", CellKind.EMPTY)),
        (True, ("Verdadeiro", CellKind.TEXT)),
        (False, ("Falso", CellKind.TEXT)),
        (42, ("42", CellKind.NUMBER)),
        (42.0, ("42", CellKind.NUMBER)),
        (12.5, ("12.5", CellKind.NUMBER)),
        ("007", ("007", CellKind.NUMBER)),
        ("#REF!", ("#REF!", CellKind.ERROR)),
        (date(2026, 10, 3), ("03/10/2026", CellKind.DATE)),
        (datetime(2026, 10, 3), ("03/10/2026", CellKind.DATE)),  # noqa: DTZ001
        (time(18, 35), ("18:35", CellKind.DATE)),
        (timedelta(hours=1), ("1:00:00", CellKind.DATE)),
        ("Ana", ("Ana", CellKind.TEXT)),
    ],
)
def test_conversao_de_celulas(value: object, expected: tuple[str, CellKind]) -> None:
    assert cell_text(value) == expected  # type: ignore[arg-type]


def test_texto_com_letras_parece_nome() -> None:
    assert is_name_like("Ana 2")
    assert not is_name_like("123")
    assert not is_name_like("--")


def test_utf16_invalido() -> None:
    with pytest.raises(InvalidTextFileError):
        decode_text(codecs.BOM_UTF16_LE + b"\x00\xd8")  # surrogate sem par


def test_utf8_com_bom_invalido() -> None:
    with pytest.raises(InvalidTextFileError):
        decode_text(codecs.BOM_UTF8 + b"\xff\xfe")


def test_detecta_nenhum_delimitador_em_texto_vazio() -> None:
    assert detect_delimiter("\n\n") == "none"


def test_campo_gigante_e_recusado() -> None:
    limits = replace(DEFAULT_LIMITS)
    with pytest.raises(InvalidTextFileError):
        parse_delimited('"' + "x" * 200_000 + '";b', "semicolon", limits)

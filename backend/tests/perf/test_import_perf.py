"""Importação com 10, 100, 1.000, 10.000 e 50.000 participantes (briefing §28)."""

import time
from functools import cache

import pytest

from app.importing import preview_file, preview_text
from tests.helpers import DEFAULT_LIMITS, large_xlsx

SIZES = [10, 100, 1_000, 10_000, 50_000]


@cache
def xlsx_with(count: int) -> bytes:
    return large_xlsx(count)


@pytest.mark.perf
@pytest.mark.parametrize("count", SIZES)
def test_xlsx(count: int) -> None:
    data = xlsx_with(count)
    start = time.perf_counter()
    preview = preview_file(
        data,
        file_format="xlsx",
        sheet=None,
        header="auto",
        column=None,
        delimiter="auto",
        limits=DEFAULT_LIMITS,
    )
    elapsed = time.perf_counter() - start
    assert preview.stats.valid == count
    assert elapsed < 5.0


@pytest.mark.perf
@pytest.mark.parametrize("count", SIZES)
def test_csv(count: int) -> None:
    body = "\n".join(f"Participante {i:05d};{i}" for i in range(count))
    data = ("Nome;Matrícula\n" + body).encode()
    start = time.perf_counter()
    preview = preview_file(
        data,
        file_format="csv",
        sheet=None,
        header="auto",
        column=None,
        delimiter="auto",
        limits=DEFAULT_LIMITS,
    )
    assert preview.stats.valid == count
    assert time.perf_counter() - start < 2.0


@pytest.mark.perf
@pytest.mark.parametrize("count", SIZES)
def test_texto_colado(count: int) -> None:
    text = "\n".join(f"Participante {i:05d}" for i in range(count))
    start = time.perf_counter()
    preview = preview_text(
        text, separator="auto", header="auto", column=None, limits=DEFAULT_LIMITS
    )
    assert preview.stats.valid == count
    assert time.perf_counter() - start < 2.0

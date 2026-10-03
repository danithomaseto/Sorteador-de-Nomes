"""Detecção de cabeçalho e da coluna com os nomes.

A detecção é só uma sugestão: a interface sempre mostra a coluna escolhida e deixa trocar.
"""

from collections.abc import Sequence
from dataclasses import dataclass

from app.domain.names import match_key, normalize_name
from app.importing.cells import CellKind, CellValue, cell_text, is_name_like

_HEADER_WORDS = frozenset(
    {
        "nome",
        "nomes",
        "name",
        "names",
        "participante",
        "participantes",
        "participant",
        "participants",
        "aluno",
        "alunos",
        "aluna",
        "alunas",
        "estudante",
        "estudantes",
        "colaborador",
        "colaboradores",
        "colaboradora",
        "colaboradoras",
        "funcionario",
        "funcionarios",
        "funcionaria",
        "funcionarias",
        "cliente",
        "clientes",
        "inscrito",
        "inscritos",
        "inscrita",
        "inscritas",
        "convidado",
        "convidados",
        "convidada",
        "convidadas",
        "pessoa",
        "pessoas",
        "membro",
        "membros",
        "jogador",
        "jogadores",
        "responsavel",
    }
)
_PREFERRED_HEADERS = ("nome completo", "nome", "name", "full name")
_NUMERIC_SHARE = 0.8
_SAMPLES = 3
_LABEL_LENGTH = 60


@dataclass(frozen=True, slots=True)
class ColumnInfo:
    index: int
    letter: str
    label: str
    samples: tuple[str, ...]
    filled: int


def column_letter(index: int) -> str:
    """0 → A, 25 → Z, 26 → AA (como no Excel)."""
    letters = ""
    number = index + 1
    while number:
        number, remainder = divmod(number - 1, 26)
        letters = chr(ord("A") + remainder) + letters
    return letters


def is_header_label(value: CellValue) -> bool:
    text, kind = cell_text(value)
    if kind is not CellKind.TEXT:
        return False
    key = match_key(normalize_name(text))
    return key in _HEADER_WORDS or key.startswith(("nome ", "name ", "nomes "))


def detect_header(rows: Sequence[tuple[CellValue, ...]], first: int) -> bool:
    """Há cabeçalho se a primeira linha tem um rótulo conhecido ("Nome", "Aluno"…) ou se ela é
    texto sobre uma coluna que, abaixo, é quase toda numérica (ex.: "Matrícula" sobre números)."""
    header = rows[first]
    if any(is_header_label(value) for value in header):
        return True
    body = [row for row in rows[first + 1 :] if row]
    for index, value in enumerate(header):
        if not is_name_like(value):
            continue
        kinds = [cell_text(row[index])[1] for row in body if index < len(row)]
        filled = [kind for kind in kinds if kind is not CellKind.EMPTY]
        numeric = sum(1 for kind in filled if kind in {CellKind.NUMBER, CellKind.DATE})
        if filled and numeric / len(filled) >= _NUMERIC_SHARE:
            return True
    return False


def describe_columns(
    rows: Sequence[tuple[CellValue, ...]], header_index: int | None, data_start: int, width: int
) -> tuple[ColumnInfo, ...]:
    columns = []
    for index in range(width):
        label = ""
        if header_index is not None and index < len(rows[header_index]):
            label = normalize_name(cell_text(rows[header_index][index])[0])[:_LABEL_LENGTH]
        samples: list[str] = []
        filled = 0
        for row in rows[data_start:]:
            if index >= len(row):
                continue
            text, kind = cell_text(row[index])
            if kind is CellKind.EMPTY:
                continue
            filled += 1
            if len(samples) < _SAMPLES and (sample := normalize_name(text)):
                samples.append(sample[:_LABEL_LENGTH])
        letter = column_letter(index)
        columns.append(
            ColumnInfo(
                index=index,
                letter=letter,
                label=label or f"Coluna {letter}",
                samples=tuple(samples),
                filled=filled,
            )
        )
    return tuple(columns)


def choose_column(
    rows: Sequence[tuple[CellValue, ...]], header_index: int | None, data_start: int, width: int
) -> int:
    """Prefere o cabeçalho "Nome" (ou similar); senão a coluna com mais textos com letras."""
    if width == 0:
        return 0
    if header_index is not None:
        header = rows[header_index]
        keys = [match_key(normalize_name(cell_text(v)[0])) for v in header[:width]]
        for preferred in _PREFERRED_HEADERS:
            if preferred in keys:
                return keys.index(preferred)
        for index, value in enumerate(header[:width]):
            if is_header_label(value):
                return index
    scores = [0] * width
    for row in rows[data_start:]:
        for index, value in enumerate(row[:width]):
            if is_name_like(value):
                scores[index] += 1
    return max(range(width), key=lambda index: (scores[index], -index))

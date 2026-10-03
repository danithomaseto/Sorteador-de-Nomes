"""Pré-visualização: transforma valores brutos em participantes válidos, sem gravar nada.

Cada valor é normalizado (``domain.names``) e classificado como válido, vazio (ignorado) ou
inválido (com motivo). Duplicados são agrupados e sinalizados, nunca removidos: a decisão é do
usuário (duas entradas "João Silva" podem ser duas pessoas).
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field, replace
from enum import StrEnum
from typing import Literal

from app.domain.names import MAX_NAME_LENGTH, NameProblem, match_key, name_problem, normalize_name
from app.importing.cells import CellKind, CellValue, cell_text
from app.importing.columns import ColumnInfo, choose_column, describe_columns, detect_header
from app.importing.errors import ColumnNotFoundError
from app.importing.xlsx_reader import SheetInfo

type Source = Literal["text", "csv", "xlsx"]
type HeaderOption = Literal["auto", "yes", "no"]

# Listas de problemas devolvidas à interface são truncadas; os totais ficam em ``stats``.
MAX_LISTED_ISSUES = 100
MAX_LISTED_GROUPS = 100
MAX_GROUP_ROWS = 20


class IssueCode(StrEnum):
    TOO_LONG = "too_long"
    CELL_ERROR = "cell_error"


@dataclass(frozen=True, slots=True)
class Entry:
    row: int
    name: str
    key: str
    repeat_of: int | None


@dataclass(frozen=True, slots=True)
class Issue:
    row: int
    code: IssueCode


@dataclass(frozen=True, slots=True)
class DuplicateGroup:
    name: str
    count: int
    rows: tuple[int, ...]


@dataclass(frozen=True, slots=True)
class Stats:
    rows: int
    valid: int
    empty: int
    invalid: int
    duplicates: int
    duplicate_groups: int
    dates: int


@dataclass(frozen=True, slots=True)
class Preview:
    source: Source
    entries: tuple[Entry, ...]
    issues: tuple[Issue, ...]
    duplicate_groups: tuple[DuplicateGroup, ...]
    stats: Stats
    separator: str | None = None
    has_header: bool = False
    columns: tuple[ColumnInfo, ...] = ()
    column: int | None = None
    sheets: tuple[SheetInfo, ...] = ()
    sheet: int | None = None
    max_name_length: int = field(default=MAX_NAME_LENGTH)


@dataclass(slots=True)
class _Classification:
    entries: list[Entry] = field(default_factory=list)
    issues: list[Issue] = field(default_factory=list)
    empty: int = 0
    dates: int = 0
    rows: int = 0
    first_name_by_key: dict[str, str] = field(default_factory=dict)
    rows_by_key: dict[str, list[int]] = field(default_factory=dict)

    def add(self, row: int, value: CellValue) -> None:
        self.rows += 1
        text, kind = cell_text(value)
        if kind is CellKind.ERROR:
            self.issues.append(Issue(row, IssueCode.CELL_ERROR))
            return
        name = normalize_name(text)
        problem = name_problem(name)
        if problem is NameProblem.EMPTY:
            self.empty += 1
            return
        if problem is NameProblem.TOO_LONG:
            self.issues.append(Issue(row, IssueCode.TOO_LONG))
            return
        if kind is CellKind.DATE:
            self.dates += 1
        key = match_key(name)
        rows = self.rows_by_key.setdefault(key, [])
        repeat_of = rows[0] if rows else None
        if not rows:
            self.first_name_by_key[key] = name
        rows.append(row)
        self.entries.append(Entry(row=row, name=name, key=key, repeat_of=repeat_of))

    def groups(self) -> list[DuplicateGroup]:
        return [
            DuplicateGroup(
                name=self.first_name_by_key[key],
                count=len(rows),
                rows=tuple(rows[:MAX_GROUP_ROWS]),
            )
            for key, rows in self.rows_by_key.items()
            if len(rows) > 1
        ]


def classify(cells: Iterable[tuple[int, CellValue]], *, source: Source) -> Preview:
    result = _Classification()
    for row, value in cells:
        result.add(row, value)
    groups = result.groups()
    stats = Stats(
        rows=result.rows,
        valid=len(result.entries),
        empty=result.empty,
        invalid=len(result.issues),
        duplicates=sum(group.count - 1 for group in groups),
        duplicate_groups=len(groups),
        dates=result.dates,
    )
    return Preview(
        source=source,
        entries=tuple(result.entries),
        issues=tuple(result.issues[:MAX_LISTED_ISSUES]),
        duplicate_groups=tuple(groups[:MAX_LISTED_GROUPS]),
        stats=stats,
    )


def preview_items(items: Sequence[tuple[int, str]], *, separator: str) -> Preview:
    """Texto sem colunas: cada item é um valor."""
    preview = classify(items, source="text")
    return replace(preview, separator=separator)


def preview_table(
    rows: Sequence[tuple[CellValue, ...]],
    *,
    source: Source,
    header: HeaderOption,
    column: int | None,
    max_columns: int,
) -> Preview:
    """Tabela (CSV, XLSX ou colunas coladas): escolhe cabeçalho e coluna e classifica."""
    first = next((index for index, row in enumerate(rows) if row), None)
    if first is None:
        empty = classify((), source=source)
        return replace(empty, column=column)
    width = min(max_columns, max(len(row) for row in rows))
    has_header = detect_header(rows, first) if header == "auto" else header == "yes"
    header_index = first if has_header else None
    data_start = first + 1 if has_header else first
    if column is not None and not 0 <= column < width:
        raise ColumnNotFoundError(column)
    chosen = column if column is not None else choose_column(rows, header_index, data_start, width)
    cells = (
        (index + 1, row[chosen] if chosen < len(row) else None)
        for index, row in enumerate(rows)
        if index >= data_start
    )
    preview = classify(cells, source=source)
    return replace(
        preview,
        has_header=has_header,
        columns=describe_columns(rows, header_index, data_start, width),
        column=chosen,
    )

from typing import Literal

from pydantic import BaseModel, Field

from app.importing.limits import MAX_COLUMNS
from app.importing.preview import Preview
from app.schemas.common import RequestModel

# Limite estrutural do campo; o limite configurável (APP_MAX_TEXT_CHARS) é aplicado no serviço.
_TEXT_HARD_LIMIT = 4_000_000


class ImportTextRequest(RequestModel):
    text: str = Field(max_length=_TEXT_HARD_LIMIT, description="Texto colado ou digitado.")
    separator: Literal["auto", "newline", "semicolon", "comma"] = Field(
        default="auto",
        description="Como separar as pessoas. Em `auto`, mais de uma linha → uma por linha; "
        "senão ponto e vírgula; senão vírgula. Colunas com tab viram tabela.",
    )
    header: Literal["auto", "yes", "no"] = "auto"
    column: int | None = Field(default=None, ge=0, lt=MAX_COLUMNS)


class EntryOut(BaseModel):
    row: int = Field(description="Linha (ou item) de origem, a partir de 1.")
    name: str = Field(description="Nome normalizado, pronto para exibir.")
    key: str = Field(description="Chave de duplicidade (sem acentos, maiúsculas e espaços extras).")
    repeat_of: int | None = Field(description="Linha da primeira ocorrência, se for repetição.")


class IssueOut(BaseModel):
    row: int
    code: Literal["too_long", "cell_error"]


class DuplicateGroupOut(BaseModel):
    name: str
    count: int
    rows: list[int] = Field(description="Primeiras linhas do grupo (até 20).")


class StatsOut(BaseModel):
    rows: int = Field(description="Linhas de dados lidas (sem o cabeçalho).")
    valid: int
    empty: int
    invalid: int
    duplicates: int = Field(description="Ocorrências repetidas além da primeira.")
    duplicate_groups: int
    dates: int = Field(description="Valores que eram datas: indica coluna provavelmente errada.")


class ColumnOut(BaseModel):
    index: int
    letter: str
    label: str
    samples: list[str]
    filled: int


class SheetOut(BaseModel):
    index: int
    name: str
    hidden: bool


class ImportPreviewOut(BaseModel):
    source: Literal["text", "csv", "xlsx"]
    entries: list[EntryOut]
    issues: list[IssueOut] = Field(description="Até 100 linhas com problema; total em `stats`.")
    duplicate_groups: list[DuplicateGroupOut] = Field(description="Até 100 grupos.")
    stats: StatsOut
    separator: str | None = Field(description="Separador usado (texto) ou delimitador (CSV).")
    has_header: bool
    columns: list[ColumnOut]
    column: int | None
    sheets: list[SheetOut]
    sheet: int | None
    max_name_length: int

    @classmethod
    def from_preview(cls, preview: Preview) -> "ImportPreviewOut":
        return cls(
            source=preview.source,
            entries=[
                EntryOut(row=e.row, name=e.name, key=e.key, repeat_of=e.repeat_of)
                for e in preview.entries
            ],
            issues=[IssueOut(row=i.row, code=i.code.value) for i in preview.issues],
            duplicate_groups=[
                DuplicateGroupOut(name=g.name, count=g.count, rows=list(g.rows))
                for g in preview.duplicate_groups
            ],
            stats=StatsOut(
                rows=preview.stats.rows,
                valid=preview.stats.valid,
                empty=preview.stats.empty,
                invalid=preview.stats.invalid,
                duplicates=preview.stats.duplicates,
                duplicate_groups=preview.stats.duplicate_groups,
                dates=preview.stats.dates,
            ),
            separator=preview.separator,
            has_header=preview.has_header,
            columns=[
                ColumnOut(
                    index=c.index,
                    letter=c.letter,
                    label=c.label,
                    samples=list(c.samples),
                    filled=c.filled,
                )
                for c in preview.columns
            ],
            column=preview.column,
            sheets=[SheetOut(index=s.index, name=s.name, hidden=s.hidden) for s in preview.sheets],
            sheet=preview.sheet,
            max_name_length=preview.max_name_length,
        )

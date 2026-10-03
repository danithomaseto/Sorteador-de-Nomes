"""Gerar o arquivo de resultado (CSV ou XLSX) a partir dos dados enviados pelo navegador."""

from dataclasses import dataclass
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import Settings
from app.domain.names import MAX_DRAW_NAME_LENGTH, clean_name, normalize_name
from app.exporting import ExportDocument, ExportRound, ExportWinner, write_csv, write_xlsx
from app.schemas.exports import ExportFormat, ExportRequest
from app.services.errors import InvalidTimezoneError, LimitExceededError
from app.services.rounds import Clock

MEDIA_TYPES: dict[ExportFormat, str] = {
    "csv": "text/csv; charset=utf-8",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
DEFAULT_DRAW_NAME = "Sorteio"


@dataclass(frozen=True, slots=True)
class ExportFile:
    content: bytes
    filename: str
    media_type: str


def build_export(
    request: ExportRequest, *, file_format: ExportFormat, clock: Clock, settings: Settings
) -> ExportFile:
    if len(request.rounds) > settings.max_export_rounds:
        raise LimitExceededError(
            limit="export_rounds",
            maximum=settings.max_export_rounds,
            detail=f"É possível exportar até {settings.max_export_rounds} rodadas por arquivo.",
        )
    document = ExportDocument(
        draw_name=_draw_name(request.draw_name),
        timezone=_timezone(request.timezone),
        generated_at=clock(),
        rounds=tuple(
            ExportRound(
                number=r.number,
                drawn_at=r.drawn_at,
                quantity=r.quantity,
                allow_repeat=r.allow_repeat,
                remove_winners=r.remove_winners,
                total_participants=r.total_participants,
                pool_size=r.pool_size,
                algorithm=r.algorithm,
                winners=tuple(
                    ExportWinner(position=w.position, name=clean_name(w.name)) for w in r.winners
                ),
            )
            for r in request.rounds
        ),
    )
    content = write_csv(document) if file_format == "csv" else write_xlsx(document)
    return ExportFile(
        content=content,
        filename=f"{document.file_stem()}.{file_format}",
        media_type=MEDIA_TYPES[file_format],
    )


def _draw_name(raw: str) -> str:
    if not normalize_name(raw):
        return DEFAULT_DRAW_NAME
    return clean_name(raw, max_length=MAX_DRAW_NAME_LENGTH)


def _timezone(key: str) -> ZoneInfo:
    try:
        return ZoneInfo(key)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise InvalidTimezoneError from exc

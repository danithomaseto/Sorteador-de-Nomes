from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.api.deps import ClockDep, SettingsDep, rate_limited
from app.schemas.common import ProblemOut, ValidationProblemOut
from app.schemas.exports import ExportRequest
from app.services.exports import MEDIA_TYPES, build_export

router = APIRouter(
    tags=["exportação"],
    dependencies=[Depends(rate_limited("exports"))],
    responses={
        422: {"model": ValidationProblemOut, "description": "Dados inválidos."},
        429: {"model": ProblemOut, "description": "Muitas requisições."},
    },
)


@router.post(
    "/exports",
    summary="Gera o arquivo de resultado (CSV ou XLSX)",
    description="Recebe as rodadas escolhidas e devolve o arquivo. Nada é gravado no servidor.",
    response_class=Response,
    responses={
        200: {
            "description": "Arquivo gerado.",
            "content": {media_type.split(";")[0]: {} for media_type in MEDIA_TYPES.values()},
        }
    },
)
def create_export(
    body: ExportRequest,
    settings: SettingsDep,
    clock: ClockDep,
    file_format: Annotated[Literal["csv", "xlsx"], Query(alias="format")] = "xlsx",
) -> Response:
    export = build_export(body, file_format=file_format, clock=clock, settings=settings)
    return Response(
        content=export.content,
        media_type=export.media_type,
        headers={"Content-Disposition": f'attachment; filename="{export.filename}"'},
    )

"""Interpretação de listas de participantes. Nada é gravado: a resposta é uma pré-visualização."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request
from starlette.concurrency import run_in_threadpool

from app.api.deps import SettingsDep, rate_limited
from app.importing.errors import FileTooLargeError
from app.importing.limits import MAX_COLUMNS
from app.schemas.common import ProblemOut, ValidationProblemOut
from app.schemas.imports import ImportPreviewOut, ImportTextRequest
from app.services import imports as import_service

router = APIRouter(
    prefix="/imports",
    tags=["importação"],
    dependencies=[Depends(rate_limited("imports"))],
    responses={
        422: {"model": ValidationProblemOut, "description": "Dados ou arquivo inválidos."},
        429: {"model": ProblemOut, "description": "Muitas requisições."},
    },
)


@router.post(
    "/text",
    summary="Interpreta texto colado ou digitado",
    description="Separa as pessoas, normaliza os nomes e aponta vazios, inválidos e duplicados. "
    "Também usado para validar um nome digitado ou editado.",
)
def import_text(body: ImportTextRequest, settings: SettingsDep) -> ImportPreviewOut:
    preview = import_service.parse_text(
        body.text,
        separator=body.separator,
        header=body.header,
        column=body.column,
        settings=settings,
    )
    return ImportPreviewOut.from_preview(preview)


@router.post(
    "/file",
    summary="Interpreta uma planilha .xlsx ou um arquivo .csv",
    description="O corpo da requisição é o próprio arquivo (não multipart), lido em memória e "
    "descartado ao fim da requisição. Opções viajam como índices: nomes de arquivo e de aba "
    "nunca aparecem na URL.",
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "application/octet-stream": {"schema": {"type": "string", "format": "binary"}}
            },
        }
    },
    responses={
        413: {"model": ProblemOut, "description": "Arquivo grande demais."},
        415: {"model": ProblemOut, "description": "Formato não suportado."},
    },
)
async def import_file(
    request: Request,
    settings: SettingsDep,
    *,
    file_format: Annotated[Literal["xlsx", "csv"] | None, Query(alias="format")] = None,
    sheet: Annotated[int | None, Query(ge=0, le=500)] = None,
    column: Annotated[int | None, Query(ge=0, lt=MAX_COLUMNS)] = None,
    header: Annotated[Literal["auto", "yes", "no"], Query()] = "auto",
    delimiter: Annotated[Literal["auto", "semicolon", "comma", "tab", "none"], Query()] = "auto",
) -> ImportPreviewOut:
    data = await _read_body(request, settings.max_upload_bytes)
    # Leitura de planilha é CPU-bound: fora do event loop.
    preview = await run_in_threadpool(
        import_service.parse_file,
        data,
        file_format=file_format,
        sheet=sheet,
        header=header,
        column=column,
        delimiter=delimiter,
        settings=settings,
    )
    return ImportPreviewOut.from_preview(preview)


async def _read_body(request: Request, max_bytes: int) -> bytes:
    declared = request.headers.get("content-length")
    if declared is not None and declared.isdigit() and int(declared) > max_bytes:
        raise FileTooLargeError(max_bytes)
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > max_bytes:
            raise FileTooLargeError(max_bytes)
    return bytes(body)

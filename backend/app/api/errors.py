"""Tradução de erros em respostas RFC 9457 (``application/problem+json``).

O usuário nunca vê detalhes técnicos: erros esperados têm código estável e mensagem amigável;
erros inesperados viram um 500 genérico com ``request_id`` (o detalhe fica só no log).
"""

import logging
from collections.abc import Mapping
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import request_id_var
from app.core.rate_limit import RateLimitedError
from app.domain.errors import AppError
from app.importing.errors import FileTooLargeError, UnsupportedFileTypeError

logger = logging.getLogger(__name__)

PROBLEM_JSON = "application/problem+json"


class PayloadTooLargeError(AppError):
    code = "payload_too_large"
    title = "Conteúdo grande demais"

    def __init__(self, max_bytes: int) -> None:
        super().__init__(
            "O conteúdo enviado passa do limite permitido. Divida a lista em partes menores.",
            max_bytes=max_bytes,
        )


_STATUS_BY_ERROR: dict[type[AppError], int] = {
    FileTooLargeError: 413,
    PayloadTooLargeError: 413,
    UnsupportedFileTypeError: 415,
    RateLimitedError: 429,
}
_HTTP_TITLES = {
    400: ("bad_request", "Requisição inválida"),
    404: ("not_found", "Não encontrado"),
    405: ("method_not_allowed", "Método não permitido"),
    413: (PayloadTooLargeError.code, PayloadTooLargeError.title),
}


def status_for(error: AppError) -> int:
    for error_type in type(error).__mro__:
        if error_type in _STATUS_BY_ERROR:
            return _STATUS_BY_ERROR[error_type]
    return 422


def problem(
    status: int,
    *,
    code: str,
    title: str,
    detail: str,
    params: dict[str, int | str] | None = None,
    extra: dict[str, Any] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
        "code": code,
        "params": params or {},
        "request_id": request_id_var.get(),
    }
    body.update(extra or {})
    return JSONResponse(body, status_code=status, media_type=PROBLEM_JSON, headers=headers)


async def _app_error(_: Request, exc: Exception) -> JSONResponse:
    exc = cast(AppError, exc)
    status = status_for(exc)
    logger.info("app_error", extra={"code": exc.code, "status": status})
    headers = {"Retry-After": str(exc.retry_after)} if isinstance(exc, RateLimitedError) else None
    return problem(
        status,
        code=exc.code,
        title=exc.title,
        detail=exc.detail,
        params=exc.params,
        headers=headers,
    )


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    exc = cast(RequestValidationError, exc)
    # Nunca devolvemos (nem registramos) o valor recebido: pode conter nomes.
    errors = [
        {
            "field": ".".join(str(part) for part in error["loc"] if part != "body"),
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    logger.info("invalid_request", extra={"fields": [e["field"] for e in errors]})
    return problem(
        422,
        code="invalid_request",
        title="Dados inválidos",
        detail="Alguns dados enviados são inválidos.",
        extra={"errors": errors},
    )


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    exc = cast(StarletteHTTPException, exc)
    code, title = _HTTP_TITLES.get(exc.status_code, ("http_error", "Erro na requisição"))
    # Só o 413 traz texto próprio (gerado por nós); nos demais, o detalhe do Starlette é técnico.
    detail = exc.detail if exc.status_code == 413 and isinstance(exc.detail, str) else title
    return problem(exc.status_code, code=code, title=title, detail=detail, headers=exc.headers)


def internal_error_body(request_id: str | None) -> dict[str, Any]:
    """Corpo do 500 genérico (enviado pelo middleware de contexto, que captura o erro)."""
    return {
        "type": "about:blank",
        "title": "Erro inesperado",
        "status": 500,
        "detail": "Algo deu errado do nosso lado. Tente novamente em instantes.",
        "code": "internal_error",
        "params": {},
        "request_id": request_id,
    }


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)

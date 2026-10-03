"""Middlewares ASGI: identificação da requisição, log técnico, cabeçalhos de segurança e limite
de tamanho do corpo.

O log de cada requisição tem método, rota (o padrão, nunca a URL com query string), status e
duração. Nada de corpo, nomes, arquivos ou IPs.
"""

import json
import logging
import re
import time
import uuid
from collections.abc import MutableMapping
from typing import Any

from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.errors import PROBLEM_JSON, PayloadTooLargeError, internal_error_body
from app.core.logging import request_id_var

logger = logging.getLogger("app.request")

_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9-]{8,64}$")
_DOCS_PATHS = ("/api/docs", "/api/openapi.json")
_SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"referrer-policy", b"no-referrer"),
    (b"x-frame-options", b"DENY"),
    (b"cross-origin-resource-policy", b"same-origin"),
    # Respostas podem conter nomes de participantes: nada de cache em navegador ou proxy.
    (b"cache-control", b"no-store"),
]
_API_CSP = (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'")


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = _header(scope, b"x-request-id")
        request_id = (
            incoming if incoming and _VALID_REQUEST_ID.match(incoming) else uuid.uuid4().hex
        )
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status = 500
        response_started = False
        is_docs = str(scope.get("path", "")).startswith(_DOCS_PATHS)

        async def send_with_headers(message: Message) -> None:
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                response_started = True
                status = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                headers.extend(_SECURITY_HEADERS)
                if not is_docs:
                    headers.append(_API_CSP)
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_headers)
        except Exception:
            # Erro inesperado: detalhe só no log; o usuário recebe um 500 genérico com request_id.
            logger.exception("unexpected_error")
            if response_started:
                raise
            await _send_json(send_with_headers, 500, internal_error_body(request_id))
        finally:
            # A API não tem parâmetros no caminho, então o caminho de uma rota conhecida é seguro
            # para log (a query string nunca é registrada). Caminhos desconhecidos não são.
            matched = scope.get("route") is not None
            logger.info(
                "request",
                extra={
                    "method": scope.get("method"),
                    "route": scope.get("path") if matched else "unmatched",
                    "status": status,
                    "duration_ms": round((time.perf_counter() - started) * 1000, 1),
                },
            )
            request_id_var.reset(token)


class BodySizeLimitMiddleware:
    """Recusa corpos acima do limite: pelo ``Content-Length`` declarado ou contando os bytes."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        declared = _header(scope, b"content-length")
        if declared is not None and declared.isdigit() and int(declared) > self.max_bytes:
            await _send_too_large(send, self.max_bytes)
            return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    # HTTPException atravessa a leitura do corpo do FastAPI (outras exceções
                    # viram 400) e é convertida em problem+json 413 pelo handler HTTP.
                    raise StarletteHTTPException(
                        413, detail=PayloadTooLargeError(self.max_bytes).detail
                    )
            return message

        await self.app(scope, limited_receive, send)


def _header(scope: Scope, name: bytes) -> str | None:
    headers: list[tuple[bytes, bytes]] = scope.get("headers", [])
    for key, value in headers:
        if key.lower() == name:
            return value.decode("latin-1")
    return None


async def _send_too_large(send: Send, max_bytes: int) -> None:
    error = PayloadTooLargeError(max_bytes)
    body: MutableMapping[str, Any] = {
        "type": "about:blank",
        "title": error.title,
        "status": 413,
        "detail": error.detail,
        "code": error.code,
        "params": error.params,
        "request_id": request_id_var.get(),
    }
    await _send_json(send, 413, body)


async def _send_json(send: Send, status: int, body: MutableMapping[str, Any]) -> None:
    payload = json.dumps(body, ensure_ascii=False).encode()
    await send(
        {
            "type": "http.response.start",
            "status": status,
            "headers": [
                (b"content-type", PROBLEM_JSON.encode()),
                (b"content-length", str(len(payload)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": payload})

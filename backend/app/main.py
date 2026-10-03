"""Ponto de entrada da API (``uvicorn app.main:app``).

A API não guarda estado: não há banco de dados, sessões nem arquivos em disco (ADR-017).
"""

from fastapi import FastAPI
from starlette.middleware.gzip import GZipMiddleware

from app.api import health
from app.api import v1 as api_v1
from app.api.errors import register_error_handlers
from app.api.middleware import BodySizeLimitMiddleware, RequestContextMiddleware
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.rate_limit import RateLimiter

API_VERSION = "0.1.0"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(
        title="Sorteia API",
        version=API_VERSION,
        summary="Importações, sorteios e exportações processados apenas em memória.",
        description="Nenhum dado de participante é armazenado. Erros seguem a RFC 9457 "
        "(`application/problem+json`) com um `code` estável.",
        docs_url="/api/docs" if settings.docs_enabled else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if settings.docs_enabled else None,
    )
    app.state.settings = settings
    app.state.rate_limiter = RateLimiter(settings)

    register_error_handlers(app)
    # A última adicionada é a mais externa: contexto (request id, log, cabeçalhos) envolve tudo.
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_body_bytes)
    app.add_middleware(RequestContextMiddleware)

    app.include_router(health.router, prefix="/api")
    app.include_router(api_v1.router, prefix="/api")
    return app


app = create_app()

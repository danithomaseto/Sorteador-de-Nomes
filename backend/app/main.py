"""Ponto de entrada da API (``uvicorn app.main:app``)."""

from fastapi import FastAPI

from app.api import health
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(
        title="Sorteia API",
        version="0.1.0",
        summary="Importações, sorteios e exportações processados apenas em memória.",
        docs_url="/api/docs" if settings.docs_enabled else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if settings.docs_enabled else None,
    )
    app.include_router(health.router, prefix="/api")
    return app


app = create_app()

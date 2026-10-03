"""Configuração da aplicação, lida de variáveis de ambiente com prefixo ``APP_``.

Não há configuração de banco de dados: a API não guarda estado (ADR-017).
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

MEGABYTE = 1024 * 1024


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", extra="ignore")

    env: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    docs_enabled: bool = Field(
        default=True, description="Expõe /api/docs e /api/openapi.json (desligar em produção)."
    )

    # Limites do produto (ver docs/security.md).
    max_participants: int = Field(default=50_000, ge=1)
    max_round_quantity: int = Field(default=10_000, ge=1)
    max_upload_bytes: int = Field(default=5 * MEGABYTE, ge=1024)
    max_uncompressed_bytes: int = Field(default=50 * MEGABYTE, ge=MEGABYTE)
    max_text_chars: int = Field(default=2_000_000, ge=1_000)
    max_body_bytes: int = Field(default=8 * MEGABYTE, ge=MEGABYTE)
    max_export_rounds: int = Field(default=1_000, ge=1)

    # Rate limit por IP (janela deslizante), formato da biblioteca `limits`.
    rate_limit_enabled: bool = True
    rate_limit_imports: str = "60/minute"
    rate_limit_rounds: str = "120/minute"
    rate_limit_exports: str = "60/minute"


@lru_cache
def get_settings() -> Settings:
    return Settings()

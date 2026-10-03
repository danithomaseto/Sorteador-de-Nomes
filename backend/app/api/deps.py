"""Dependências injetadas nas rotas (substituíveis nos testes via ``dependency_overrides``)."""

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request

from app.core.config import Settings
from app.core.rate_limit import RateLimiter, Scope
from app.domain.draw_engine import RandomSource, SecretsRandomSource
from app.services.rounds import Clock


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def get_random_source() -> RandomSource:
    return SecretsRandomSource()


def utc_now() -> datetime:
    return datetime.now(UTC)


def get_clock() -> Clock:
    return utc_now


def rate_limited(scope: Scope) -> Callable[[Request], None]:
    def check(request: Request) -> None:
        limiter: RateLimiter = request.app.state.rate_limiter
        client = request.client.host if request.client else "desconhecido"
        limiter.check(scope, client)

    return check


SettingsDep = Annotated[Settings, Depends(get_settings)]
RandomSourceDep = Annotated[RandomSource, Depends(get_random_source)]
ClockDep = Annotated[Clock, Depends(get_clock)]

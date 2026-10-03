from collections.abc import Callable, Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_clock, get_random_source
from app.core.config import Settings
from app.domain.draw_engine import RandomSource, SeededRandomSource
from app.main import create_app
from app.services.rounds import Clock

FIXED_NOW = datetime(2026, 10, 3, 21, 35, 12, tzinfo=UTC)

type ClientFactory = Callable[..., TestClient]


def test_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {"env": "test", "rate_limit_enabled": False, "log_level": "INFO"}
    values.update(overrides)
    return Settings.model_validate(values)


def _seeded() -> RandomSource:
    return SeededRandomSource(2026)


def _fixed_clock() -> Clock:
    return lambda: FIXED_NOW


@pytest.fixture
def make_client() -> Iterator[ClientFactory]:
    """Cria clientes com configurações próprias; aleatoriedade e relógio fixos por padrão."""
    clients: list[TestClient] = []

    def factory(*, real_random: bool = False, **overrides: object) -> TestClient:
        app = create_app(test_settings(**overrides))
        if not real_random:
            app.dependency_overrides[get_random_source] = _seeded
        app.dependency_overrides[get_clock] = _fixed_clock
        client = TestClient(app, raise_server_exceptions=False)
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.close()


@pytest.fixture
def client(make_client: ClientFactory) -> TestClient:
    return make_client()

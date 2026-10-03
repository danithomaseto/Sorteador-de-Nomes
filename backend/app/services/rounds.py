"""Executar uma rodada: valida limites e chama o motor com as posições ``0..pool_size-1``.

O servidor não recebe nomes nem guarda o resultado (ADR-017, ADR-018).
"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime

from app.core.config import Settings
from app.domain.draw_engine import RandomSource, draw
from app.services.errors import LimitExceededError

type Clock = Callable[[], datetime]


@dataclass(frozen=True, slots=True)
class RoundOutcome:
    positions: tuple[int, ...]
    pool_size: int
    quantity: int
    allow_repeat: bool
    algorithm: str
    drawn_at: datetime


def execute_round(
    *,
    pool_size: int,
    quantity: int,
    allow_repeat: bool,
    rng: RandomSource,
    clock: Clock,
    settings: Settings,
) -> RoundOutcome:
    if pool_size > settings.max_participants:
        raise LimitExceededError(
            limit="participants",
            maximum=settings.max_participants,
            detail=f"O limite é de {settings.max_participants} participantes por sorteio.",
        )
    if quantity > settings.max_round_quantity:
        raise LimitExceededError(
            limit="round_quantity",
            maximum=settings.max_round_quantity,
            detail=f"O limite é de {settings.max_round_quantity} vencedores por rodada.",
        )
    result = draw(range(pool_size), quantity, allow_repeat=allow_repeat, rng=rng)
    return RoundOutcome(
        positions=result.positions,
        pool_size=result.pool_size,
        quantity=result.quantity,
        allow_repeat=result.allow_repeat,
        algorithm=result.algorithm,
        drawn_at=clock(),
    )

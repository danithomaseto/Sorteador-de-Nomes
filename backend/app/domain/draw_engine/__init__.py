"""Motor de sorteio (puro). Ver ``engine.py`` para o algoritmo e ``random_source.py`` para a
escolha da fonte de aleatoriedade."""

from app.domain.draw_engine.engine import (
    WITH_REPETITION,
    WITHOUT_REPETITION,
    DrawResult,
    draw,
)
from app.domain.draw_engine.errors import (
    EmptyPoolError,
    InsufficientParticipantsError,
    InvalidQuantityError,
)
from app.domain.draw_engine.random_source import (
    RandomSource,
    SecretsRandomSource,
    SeededRandomSource,
)

__all__ = [
    "WITHOUT_REPETITION",
    "WITH_REPETITION",
    "DrawResult",
    "EmptyPoolError",
    "InsufficientParticipantsError",
    "InvalidQuantityError",
    "RandomSource",
    "SecretsRandomSource",
    "SeededRandomSource",
    "draw",
]

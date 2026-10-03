"""Desempenho do motor com 10, 100, 1.000, 10.000 e 50.000 participantes (briefing §28).

Limites generosos para não oscilar em máquinas de CI; os tempos reais ficam bem abaixo.
"""

import time
from collections.abc import Callable

import pytest

from app.domain.draw_engine import SecretsRandomSource, draw

SIZES = [10, 100, 1_000, 10_000, 50_000]


def best_of(runs: int, action: Callable[[], object]) -> float:
    timings = []
    for _ in range(runs):
        start = time.perf_counter()
        action()
        timings.append(time.perf_counter() - start)
    return min(timings)


@pytest.mark.perf
@pytest.mark.parametrize("pool_size", SIZES)
def test_sortear_10_vencedores(pool_size: int) -> None:
    source = SecretsRandomSource()
    quantity = min(10, pool_size)
    elapsed = best_of(5, lambda: draw(range(pool_size), quantity, allow_repeat=False, rng=source))
    assert elapsed < 0.05


@pytest.mark.perf
@pytest.mark.parametrize("pool_size", SIZES)
def test_ordenar_a_lista_inteira(pool_size: int) -> None:
    source = SecretsRandomSource()
    elapsed = best_of(3, lambda: draw(range(pool_size), pool_size, allow_repeat=False, rng=source))
    assert elapsed < 0.5


@pytest.mark.perf
def test_10_mil_vencedores_com_repeticao_em_50_mil() -> None:
    source = SecretsRandomSource()
    elapsed = best_of(3, lambda: draw(range(50_000), 10_000, allow_repeat=True, rng=source))
    assert elapsed < 0.5

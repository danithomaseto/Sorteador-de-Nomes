"""Propriedades do motor verificadas com Hypothesis em milhares de combinações."""

from hypothesis import given, settings
from hypothesis import strategies as st

from app.domain.draw_engine import SeededRandomSource, draw

seeds = st.integers(min_value=0, max_value=2**32)


@st.composite
def pool_and_quantity(draw_value: st.DrawFn) -> tuple[int, int]:
    pool_size = draw_value(st.integers(min_value=1, max_value=300))
    quantity = draw_value(st.integers(min_value=1, max_value=pool_size))
    return pool_size, quantity


@settings(max_examples=300)
@given(pool_and_quantity(), seeds)
def test_sem_repeticao(params: tuple[int, int], seed: int) -> None:
    pool_size, quantity = params
    candidates = [f"c{i}" for i in range(pool_size)]
    result = draw(candidates, quantity, allow_repeat=False, rng=SeededRandomSource(seed))

    assert len(result.winners) == quantity
    assert len(set(result.winners)) == quantity
    assert set(result.winners) <= set(candidates)
    assert len(result.remaining) == pool_size - quantity
    assert set(result.winners) | set(result.remaining) == set(candidates)
    assert list(result.remaining) == [c for c in candidates if c not in set(result.winners)]


@settings(max_examples=300)
@given(
    st.integers(min_value=1, max_value=200),
    st.integers(min_value=1, max_value=500),
    seeds,
)
def test_com_repeticao(pool_size: int, quantity: int, seed: int) -> None:
    candidates = list(range(pool_size))
    result = draw(candidates, quantity, allow_repeat=True, rng=SeededRandomSource(seed))

    assert len(result.winners) == quantity
    assert all(0 <= w < pool_size for w in result.winners)
    assert set(result.remaining) == set(candidates) - set(result.winners)


@settings(max_examples=100)
@given(
    st.integers(min_value=1, max_value=120),
    st.integers(min_value=1, max_value=15),
    seeds,
)
def test_rodadas_sucessivas_removendo_vencedores(pool_size: int, per_round: int, seed: int) -> None:
    pool: tuple[int, ...] = tuple(range(pool_size))
    seen: list[int] = []
    source = SeededRandomSource(seed)
    while len(pool) >= per_round:
        result = draw(pool, per_round, allow_repeat=False, rng=source)
        seen.extend(result.winners)
        pool = result.remaining
    assert len(seen) == len(set(seen))
    assert set(seen) | set(pool) == set(range(pool_size))

"""Motor de sorteio: seleção aleatória pura, sem dependência de HTTP, armazenamento ou interface.

O motor trabalha com **posições** na lista de candidatos e nunca compara nomes: duas entradas
"João Silva" são candidatos distintos (podem ser duas pessoas). O tipo dos candidatos é livre.

Algoritmos:

* sem repetição — Fisher–Yates parcial sobre os índices: a cada passo ``i`` troca-se o índice
  ``i`` com um índice uniforme em ``[i, n)``. Os ``k`` primeiros formam uma seleção ordenada em
  que cada uma das ``n!/(n-k)!`` sequências possíveis tem a mesma probabilidade.
  Custo: O(n) para copiar os índices e O(k) trocas.
* com repetição — ``k`` sorteios independentes e uniformes em ``[0, n)`` (com reposição).

"Remover vencedores entre rodadas" é responsabilidade de quem chama: basta usar ``remaining``
como candidatos da rodada seguinte.
"""

from collections.abc import Sequence
from dataclasses import dataclass

from app.domain.draw_engine.errors import (
    EmptyPoolError,
    InsufficientParticipantsError,
    InvalidQuantityError,
)
from app.domain.draw_engine.random_source import RandomSource

WITHOUT_REPETITION = "partial-fisher-yates/1"
WITH_REPETITION = "uniform-with-replacement/1"


@dataclass(frozen=True, slots=True)
class DrawResult[T]:
    """Resultado de uma rodada.

    ``winners`` e ``positions`` estão na ordem do sorteio (1º, 2º, …); ``positions`` são os
    índices dos vencedores em ``candidates``. ``remaining`` são os candidatos não sorteados, na
    ordem original.
    """

    winners: tuple[T, ...]
    positions: tuple[int, ...]
    remaining: tuple[T, ...]
    pool_size: int
    quantity: int
    allow_repeat: bool
    algorithm: str


def draw[T](
    candidates: Sequence[T],
    quantity: int,
    *,
    allow_repeat: bool,
    rng: RandomSource,
) -> DrawResult[T]:
    """Sorteia ``quantity`` candidatos.

    :raises InvalidQuantityError: ``quantity`` menor que 1.
    :raises EmptyPoolError: não há candidatos.
    :raises InsufficientParticipantsError: sem repetição e ``quantity`` maior que os candidatos.
    """
    pool_size = len(candidates)
    if isinstance(quantity, bool) or quantity < 1:
        raise InvalidQuantityError(quantity)
    if pool_size == 0:
        raise EmptyPoolError

    if allow_repeat:
        positions = tuple(rng.randbelow(pool_size) for _ in range(quantity))
        method = WITH_REPETITION
    else:
        if quantity > pool_size:
            raise InsufficientParticipantsError(available=pool_size, requested=quantity)
        positions = _partial_fisher_yates(pool_size, quantity, rng)
        method = WITHOUT_REPETITION

    chosen = set(positions)
    return DrawResult(
        winners=tuple(candidates[position] for position in positions),
        positions=positions,
        remaining=tuple(c for index, c in enumerate(candidates) if index not in chosen),
        pool_size=pool_size,
        quantity=quantity,
        allow_repeat=allow_repeat,
        algorithm=f"{method}+{rng.name}",
    )


def _partial_fisher_yates(pool_size: int, quantity: int, rng: RandomSource) -> tuple[int, ...]:
    indices = list(range(pool_size))
    for i in range(quantity):
        j = i + rng.randbelow(pool_size - i)
        indices[i], indices[j] = indices[j], indices[i]
    return tuple(indices[:quantity])

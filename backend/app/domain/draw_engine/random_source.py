"""Fontes de aleatoriedade do motor de sorteio.

Produção usa :class:`SecretsRandomSource`: o gerador de números aleatórios criptograficamente
seguro (CSPRNG) do sistema operacional, via módulo :mod:`secrets` (``os.urandom``, que no Linux
usa ``getrandom()``). ``secrets.randbelow`` faz amostragem por rejeição, portanto não há viés de
módulo: cada inteiro em ``[0, upper)`` tem exatamente a mesma probabilidade.

Por que não o módulo :mod:`random`: o Mersenne Twister tem boa distribuição estatística, mas é
previsível — com cerca de 624 saídas observadas o estado interno pode ser reconstruído e os
próximos resultados, previstos.

:class:`SeededRandomSource` existe apenas para testes reprodutíveis. A API nunca aceita seed:
quem escolhe a seed escolhe o resultado.
"""

import random
import secrets
from typing import Protocol


class RandomSource(Protocol):
    """Fornece inteiros uniformes. Implementações devem ser imparciais em ``[0, upper)``."""

    @property
    def name(self) -> str:
        """Identificador gravado nos metadados de cada rodada."""
        ...

    def randbelow(self, upper: int) -> int:
        """Inteiro uniforme em ``[0, upper)``; ``upper`` é sempre maior que zero."""
        ...


class SecretsRandomSource:
    """Fonte de produção: CSPRNG do sistema operacional."""

    name = "os-csprng"

    def randbelow(self, upper: int) -> int:
        return secrets.randbelow(upper)


class SeededRandomSource:
    """Fonte reprodutível, **somente para testes**. Nunca usar para sortear de verdade."""

    def __init__(self, seed: int) -> None:
        # Não criptográfico por design: o objetivo é reproduzir resultados nos testes.
        self._rng = random.Random(seed)  # noqa: S311
        self.name = f"seeded-prng/{seed}"

    def randbelow(self, upper: int) -> int:
        return self._rng.randrange(upper)

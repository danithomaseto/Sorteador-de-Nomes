"""Rate limit por cliente, em memória (janela deslizante).

Minimização: o endereço IP nunca é guardado em claro. A chave é um hash SHA-256 do IP com um sal
aleatório gerado a cada início do processo, e as entradas expiram junto com a janela do limite.

Os contadores são por processo: com vários workers o limite efetivo é aproximado, o que basta
para conter abuso. Para limites exatos entre instâncias, trocar o armazenamento por Redis.
"""

import hashlib
import secrets
import time
from typing import Literal

from limits import RateLimitItem, parse
from limits.storage import MemoryStorage
from limits.strategies import MovingWindowRateLimiter

from app.core.config import Settings
from app.domain.errors import AppError

type Scope = Literal["imports", "rounds", "exports"]


class RateLimitedError(AppError):
    code = "rate_limited"
    title = "Muitas requisições"

    def __init__(self, retry_after: int) -> None:
        super().__init__(
            "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.",
            retry_after=retry_after,
        )
        self.retry_after = retry_after


class RateLimiter:
    def __init__(self, settings: Settings) -> None:
        self.enabled = settings.rate_limit_enabled
        self._strategy = MovingWindowRateLimiter(MemoryStorage())
        self._salt = secrets.token_bytes(16)
        self._items: dict[Scope, RateLimitItem] = {
            "imports": parse(settings.rate_limit_imports),
            "rounds": parse(settings.rate_limit_rounds),
            "exports": parse(settings.rate_limit_exports),
        }

    def check(self, scope: Scope, client: str) -> None:
        if not self.enabled:
            return
        item = self._items[scope]
        key = hashlib.sha256(self._salt + client.encode()).hexdigest()[:32]
        if not self._strategy.hit(item, scope, key):
            stats = self._strategy.get_window_stats(item, scope, key)
            raise RateLimitedError(retry_after=max(1, int(stats.reset_time - time.time()) + 1))

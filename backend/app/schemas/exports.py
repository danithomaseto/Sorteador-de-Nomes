from typing import Literal

from pydantic import AwareDatetime, Field

from app.schemas.common import RequestModel

# Limites estruturais; nomes são normalizados e validados (até 120 caracteres) no serviço.
_TEXT_HARD_LIMIT = 500
_MAX_WINNERS_PER_ROUND = 50_000

# Mantido em sincronia com o motor por teste (tests/api/test_exports.py).
type Algorithm = Literal[
    "partial-fisher-yates/1+os-csprng",
    "uniform-with-replacement/1+os-csprng",
]


class ExportWinnerIn(RequestModel):
    position: int = Field(ge=1)
    name: str = Field(max_length=_TEXT_HARD_LIMIT)


class ExportRoundIn(RequestModel):
    number: int = Field(ge=1)
    # JSON não tem tipo data: aceitamos texto ISO 8601 com fuso (modo estrito só nos demais campos).
    drawn_at: AwareDatetime = Field(strict=False)
    quantity: int = Field(ge=1)
    allow_repeat: bool
    remove_winners: bool
    total_participants: int = Field(ge=0)
    pool_size: int = Field(ge=0)
    algorithm: Algorithm
    winners: list[ExportWinnerIn] = Field(min_length=1, max_length=_MAX_WINNERS_PER_ROUND)


class ExportRequest(RequestModel):
    """Dados que o navegador envia para gerar o arquivo. Nada é guardado no servidor."""

    draw_name: str = Field(max_length=_TEXT_HARD_LIMIT)
    timezone: str = Field(max_length=64, description="Fuso IANA, ex.: America/Sao_Paulo.")
    rounds: list[ExportRoundIn] = Field(min_length=1)


type ExportFormat = Literal["csv", "xlsx"]

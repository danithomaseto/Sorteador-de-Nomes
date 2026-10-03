from pydantic import AwareDatetime, BaseModel, Field

from app.schemas.common import RequestModel


class RoundRequest(RequestModel):
    """Pedido de rodada. Nenhum nome é enviado: o servidor escolhe posições na lista de
    participantes disponíveis que o navegador congelou no momento do clique (ADR-018)."""

    pool_size: int = Field(ge=0, description="Quantos participantes estão disponíveis.")
    quantity: int = Field(ge=1, description="Quantos vencedores sortear.")
    allow_repeat: bool = Field(description="Se a mesma pessoa pode sair mais de uma vez.")


class RoundOut(BaseModel):
    positions: list[int] = Field(
        description="Posições sorteadas (a partir de 0) na lista de disponíveis, na ordem do "
        "sorteio: a primeira é o 1º vencedor."
    )
    pool_size: int
    quantity: int
    allow_repeat: bool
    algorithm: str = Field(description="Algoritmo e fonte de aleatoriedade usados.")
    drawn_at: AwareDatetime = Field(description="Horário oficial da rodada (relógio do servidor).")

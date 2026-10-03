from fastapi import APIRouter, Depends

from app.api.deps import ClockDep, RandomSourceDep, SettingsDep, rate_limited
from app.schemas.common import ProblemOut, ValidationProblemOut
from app.schemas.rounds import RoundOut, RoundRequest
from app.services.rounds import execute_round

router = APIRouter(
    tags=["sorteio"],
    dependencies=[Depends(rate_limited("rounds"))],
    responses={
        422: {"model": ValidationProblemOut, "description": "Pedido inválido."},
        429: {"model": ProblemOut, "description": "Muitas requisições."},
    },
)


@router.post(
    "/rounds",
    summary="Executa uma rodada",
    description="Sorteia posições na lista de participantes disponíveis com o gerador "
    "criptográfico do sistema operacional. Nenhum nome é enviado e nada é gravado.",
)
def create_round(
    body: RoundRequest, settings: SettingsDep, rng: RandomSourceDep, clock: ClockDep
) -> RoundOut:
    outcome = execute_round(
        pool_size=body.pool_size,
        quantity=body.quantity,
        allow_repeat=body.allow_repeat,
        rng=rng,
        clock=clock,
        settings=settings,
    )
    return RoundOut(
        positions=list(outcome.positions),
        pool_size=outcome.pool_size,
        quantity=outcome.quantity,
        allow_repeat=outcome.allow_repeat,
        algorithm=outcome.algorithm,
        drawn_at=outcome.drawn_at,
    )

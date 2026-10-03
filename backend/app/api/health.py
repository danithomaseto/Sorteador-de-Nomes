from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["saúde"])


class HealthOut(BaseModel):
    status: Literal["ok"]


@router.get("/health", summary="Verifica se a API está respondendo")
def health() -> HealthOut:
    # Sem banco de dados nem dependências externas: responder já é estar saudável.
    return HealthOut(status="ok")

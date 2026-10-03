from pydantic import BaseModel, ConfigDict


class RequestModel(BaseModel):
    """Base dos corpos de requisição: tipos estritos e campos desconhecidos recusados."""

    model_config = ConfigDict(strict=True, extra="forbid")


class ProblemOut(BaseModel):
    """Erro no formato RFC 9457 (``application/problem+json``)."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str
    code: str
    params: dict[str, int | str] = {}
    request_id: str | None = None


class FieldErrorOut(BaseModel):
    field: str
    type: str


class ValidationProblemOut(ProblemOut):
    errors: list[FieldErrorOut] = []

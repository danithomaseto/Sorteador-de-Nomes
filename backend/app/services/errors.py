from app.domain.errors import AppError


class LimitExceededError(AppError):
    code = "limit_exceeded"
    title = "Limite excedido"

    def __init__(self, *, limit: str, maximum: int, detail: str) -> None:
        super().__init__(detail, limit=limit, maximum=maximum)


class InvalidTimezoneError(AppError):
    code = "invalid_timezone"
    title = "Fuso horário inválido"

    def __init__(self) -> None:
        super().__init__("O fuso horário informado não é reconhecido.")

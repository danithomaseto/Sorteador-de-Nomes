from app.domain.errors import AppError, plural


class InvalidQuantityError(AppError):
    code = "invalid_quantity"
    title = "Quantidade inválida"

    def __init__(self, quantity: int) -> None:
        super().__init__(
            "A quantidade de vencedores deve ser um número inteiro a partir de 1.",
            quantity=quantity,
        )


class EmptyPoolError(AppError):
    code = "empty_pool"
    title = "Nenhum participante disponível"

    def __init__(self) -> None:
        super().__init__("Não há participantes disponíveis para sortear.")


class InsufficientParticipantsError(AppError):
    code = "insufficient_participants"
    title = "Participantes insuficientes"

    def __init__(self, *, available: int, requested: int) -> None:
        participants = plural(available, "participante disponível", "participantes disponíveis")
        super().__init__(
            f"Há {available} {participants} e {requested} foram solicitados. "
            "Diminua a quantidade ou permita repetição.",
            available=available,
            requested=requested,
        )

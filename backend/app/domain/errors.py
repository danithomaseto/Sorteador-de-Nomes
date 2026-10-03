"""Erro base do produto.

Fica na camada mais interna (``domain``) para que todas as outras possam usá-lo sem inverter a
regra de dependência. A camada HTTP decide o status de cada erro; aqui só existem códigos estáveis.
"""

from typing import ClassVar


class AppError(Exception):
    """Erro esperado, com código estável (exposto na API no formato RFC 9457).

    ``detail`` e ``params`` nunca contêm dados pessoais (nomes, conteúdo de arquivos).
    """

    code: ClassVar[str] = "app_error"
    title: ClassVar[str] = "Não foi possível concluir a operação"

    def __init__(self, detail: str | None = None, **params: int | str) -> None:
        self.detail = detail or self.title
        self.params: dict[str, int | str] = params
        super().__init__(self.detail)


def plural(count: int, singular: str, plural_form: str) -> str:
    """Escolhe a forma da palavra conforme a contagem (1 participante, 2 participantes)."""
    return singular if count == 1 else plural_form

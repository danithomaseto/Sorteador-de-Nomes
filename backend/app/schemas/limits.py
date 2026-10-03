from pydantic import BaseModel


class LimitsOut(BaseModel):
    """Limites do serviço, para a interface validar antes de enviar."""

    max_participants: int
    max_round_quantity: int
    max_name_length: int
    max_draw_name_length: int
    max_upload_bytes: int
    max_text_chars: int
    max_export_rounds: int

from fastapi import APIRouter

from app.api.deps import SettingsDep
from app.domain.names import MAX_DRAW_NAME_LENGTH, MAX_NAME_LENGTH
from app.schemas.limits import LimitsOut

router = APIRouter(tags=["configuração"])


@router.get("/limits", summary="Limites do serviço")
def get_limits(settings: SettingsDep) -> LimitsOut:
    return LimitsOut(
        max_participants=settings.max_participants,
        max_round_quantity=settings.max_round_quantity,
        max_name_length=MAX_NAME_LENGTH,
        max_draw_name_length=MAX_DRAW_NAME_LENGTH,
        max_upload_bytes=settings.max_upload_bytes,
        max_text_chars=settings.max_text_chars,
        max_export_rounds=settings.max_export_rounds,
    )

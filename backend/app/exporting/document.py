"""Conteúdo de uma exportação e textos comuns aos formatos CSV e XLSX."""

import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain.draw_engine import WITH_REPETITION, WITHOUT_REPETITION

_METHODS = {
    WITHOUT_REPETITION: "sem repetição na rodada (Fisher–Yates parcial)",
    WITH_REPETITION: "com reposição (sorteios independentes)",
}
_SOURCES = {"os-csprng": "gerador de números aleatórios criptográfico do sistema operacional"}
_SLUG_LENGTH = 40


@dataclass(frozen=True, slots=True)
class ExportWinner:
    position: int
    name: str


@dataclass(frozen=True, slots=True)
class ExportRound:
    number: int
    drawn_at: datetime
    quantity: int
    allow_repeat: bool
    remove_winners: bool
    total_participants: int
    pool_size: int
    algorithm: str
    winners: tuple[ExportWinner, ...]


@dataclass(frozen=True, slots=True)
class ExportDocument:
    draw_name: str
    timezone: ZoneInfo
    generated_at: datetime
    rounds: tuple[ExportRound, ...]

    def local(self, moment: datetime) -> str:
        return moment.astimezone(self.timezone).strftime("%d/%m/%Y %H:%M:%S")

    def file_stem(self) -> str:
        slug = slugify(self.draw_name) or "sorteio"
        if len(self.rounds) == 1:
            return f"{slug}-rodada-{self.rounds[0].number}"
        return f"{slug}-rodadas"


def yes_no(value: bool) -> str:
    return "Sim" if value else "Não"


def describe_algorithm(algorithm: str) -> str:
    method, _, source = algorithm.partition("+")
    method_text = _METHODS.get(method, method)
    source_text = _SOURCES.get(source, source)
    return f"Seleção aleatória {method_text}, com o {source_text}."


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:_SLUG_LENGTH].rstrip("-")

"""CSV pensado para o Excel em português: UTF-8 com BOM (acentos corretos) e ``;`` como separador.

Formato "uma linha por vencedor", com os metadados da rodada repetidos em colunas — fácil de
filtrar e de importar em outros sistemas.
"""

import codecs
import csv
import io

from app.exporting.document import ExportDocument, yes_no
from app.exporting.safe_cells import neutralize_formula

HEADER = (
    "Sorteio",
    "Rodada",
    "Data e hora",
    "Fuso horário",
    "Posição",
    "Vencedor",
    "Repetição na mesma rodada",
    "Vencedores removidos das próximas rodadas",
    "Participantes disponíveis na rodada",
    "Total de participantes na lista",
)


def write_csv(document: ExportDocument) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";", lineterminator="\r\n")
    writer.writerow(HEADER)
    draw_name = neutralize_formula(document.draw_name)
    timezone = document.timezone.key
    for draw_round in document.rounds:
        drawn_at = document.local(draw_round.drawn_at)
        for winner in draw_round.winners:
            writer.writerow(
                (
                    draw_name,
                    draw_round.number,
                    drawn_at,
                    timezone,
                    winner.position,
                    neutralize_formula(winner.name),
                    yes_no(draw_round.allow_repeat),
                    yes_no(draw_round.remove_winners),
                    draw_round.pool_size,
                    draw_round.total_participants,
                )
            )
    return codecs.BOM_UTF8 + buffer.getvalue().encode("utf-8")

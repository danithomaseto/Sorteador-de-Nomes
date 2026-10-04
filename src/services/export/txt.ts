/** Texto simples, legível em qualquer editor: para colar num e-mail, chat ou ata. */
import { countLabel } from "~/utils/format";
import {
  describeAlgorithm,
  EXPORT_NOTE,
  localDateTime,
  ordinal,
  type ExportDocument,
  type ExportRound,
} from "./document";

const BOM = "\u{feff}";

export function writeTxt(document: ExportDocument): string {
  const lines = [`Resultado do sorteio — ${document.drawName}`, ""];
  for (const round of document.rounds) lines.push(...roundLines(round, document.timeZone), "");
  lines.push(
    EXPORT_NOTE,
    `Arquivo gerado em ${localDateTime(document.generatedAt, document.timeZone)} (${document.timeZone}).`,
  );
  return BOM + lines.join("\r\n") + "\r\n";
}

function roundLines(round: ExportRound, timeZone: string): string[] {
  const width = ordinal(round.winners.length).length;
  const rules = [
    `${countLabel(round.quantity, "sorteado", "sorteados")} entre ${countLabel(round.poolSize, "participante disponível", "participantes disponíveis")}`,
    round.allowRepeat ? "com repetição na rodada" : "sem repetição na rodada",
    round.removeWinners
      ? "vencedores removidos das próximas rodadas"
      : "vencedores continuam nas próximas rodadas",
  ];
  return [
    `Rodada ${String(round.number)} · ${localDateTime(round.drawnAt, timeZone)}`,
    "",
    ...round.winners.map((winner) => `${ordinal(winner.position).padStart(width)}  ${winner.name}`),
    "",
    `${rules.join(" · ")}.`,
    describeAlgorithm(round.algorithm),
  ];
}

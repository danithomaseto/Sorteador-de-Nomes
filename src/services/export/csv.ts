/**
 * CSV pensado para o Excel em português: UTF-8 com BOM (acentos corretos) e `;` como separador.
 * Uma linha por vencedor, com os metadados da rodada repetidos em colunas — fácil de filtrar.
 */
import { localDateTime, yesNo, type ExportDocument } from "./document";
import { neutralizeFormula } from "./safeCells";

const HEADER = [
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
];
const BOM = "\u{feff}";

export function writeCsv(document: ExportDocument): string {
  const lines = [HEADER];
  const drawName = neutralizeFormula(document.drawName);
  for (const round of document.rounds) {
    const drawnAt = localDateTime(round.drawnAt, document.timeZone);
    for (const winner of round.winners) {
      lines.push([
        drawName,
        String(round.number),
        drawnAt,
        document.timeZone,
        String(winner.position),
        neutralizeFormula(winner.name),
        yesNo(round.allowRepeat),
        yesNo(round.removeWinners),
        String(round.poolSize),
        String(round.totalParticipants),
      ]);
    }
  }
  return BOM + lines.map((fields) => fields.map(quote).join(";")).join("\r\n") + "\r\n";
}

function quote(field: string): string {
  return /[;"\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

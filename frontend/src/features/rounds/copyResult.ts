import type { Round } from "~/features/session/model";
import { formatDateTime, formatPosition } from "~/lib/format";

export function resultText(drawName: string, round: Round): string {
  const lines = [
    drawName,
    `Rodada ${String(round.number)} · ${formatDateTime(round.drawnAt, true)}`,
    "",
    ...round.winners.map((w) => `${formatPosition(w.position, round.winners.length)}. ${w.name}`),
  ];
  return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

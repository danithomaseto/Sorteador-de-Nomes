import type { Round } from "~/features/session/model";
import { ordinal } from "~/services/export";
import { formatDateTime } from "~/utils/format";

export function resultText(drawName: string, round: Round): string {
  const lines = [
    drawName,
    `Rodada ${String(round.number)} · ${formatDateTime(round.drawnAt, true)}`,
    "",
    ...round.winners.map((w) => `${ordinal(w.position)} ${w.name}`),
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

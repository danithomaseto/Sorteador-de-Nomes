import type { Round } from "~/features/session/model";
import type { ExportFormat, ExportRequest } from "~/lib/api/client";
import { userTimeZone } from "~/lib/format";

type ExportAlgorithm = ExportRequest["rounds"][number]["algorithm"];

/** Monta o pedido de exportação: só o nome do sorteio e as rodadas escolhidas. */
export function buildExportRequest(drawName: string, rounds: readonly Round[]): ExportRequest {
  return {
    draw_name: drawName,
    timezone: userTimeZone(),
    rounds: rounds.map((round) => ({
      number: round.number,
      drawn_at: round.drawnAt,
      quantity: round.quantity,
      allow_repeat: round.allowRepeat,
      remove_winners: round.removeWinners,
      total_participants: round.totalParticipants,
      pool_size: round.poolSize,
      // O algoritmo veio do próprio servidor na resposta da rodada.
      algorithm: round.algorithm as ExportAlgorithm,
      winners: round.winners.map((winner) => ({ position: winner.position, name: winner.name })),
    })),
  };
}

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function exportFileName(
  drawName: string,
  rounds: readonly Round[],
  format: ExportFormat,
): string {
  const base = slugify(drawName) || "sorteio";
  const suffix =
    rounds.length === 1 && rounds[0] ? `rodada-${String(rounds[0].number)}` : "rodadas";
  return `${base}-${suffix}.${format}`;
}

/** Entrega o arquivo ao usuário sem guardar nada: o link temporário é revogado em seguida. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

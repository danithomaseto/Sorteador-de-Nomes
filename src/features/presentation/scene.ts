/**
 * O que o palco mostra a cada momento, em dados simples. O modo apresentação desenha a cena e a
 * envia, igual, ao telão (ver `screen.ts`): só trafegam os nomes que já estão na tela.
 */
export type ReelPace = "normal" | "quick";

export interface SceneWinner {
  readonly position: number;
  readonly name: string;
}

export type StageScene =
  /** Antes da primeira rodada. `prepared`: há participantes para sortear. */
  | { readonly phase: "ready"; readonly prepared: boolean }
  | {
      readonly phase: "reel";
      /** Muda a cada animação, para o telão reiniciar as roletas junto. */
      readonly id: string;
      /** Amostra cosmética para as roletas (ver `animationSample`). */
      readonly names: readonly string[];
      /** Vencedores em que as roletas param (no máximo `REEL_LIMIT`). */
      readonly winners: readonly string[];
      /** Total de vencedores da rodada. */
      readonly total: number;
      readonly label: string;
      readonly pace: ReelPace;
    }
  | { readonly phase: "single"; readonly heading: string; readonly name: string }
  | { readonly phase: "grid"; readonly winners: readonly SceneWinner[]; readonly total: number };

/** Vencedores mostrados de uma vez no palco; os demais ficam no resultado e na exportação. */
export const GRID_LIMIT = 30;
/** Vencedores enviados para as roletas: mais do que isso não cabe na tela. */
export const REEL_LIMIT = 30;

interface RoundProgress {
  readonly roundNumber: number;
  readonly winners: readonly SceneWinner[];
  readonly revealed: number;
  readonly animating: number | null;
  readonly sequential: boolean;
  readonly sample: readonly string[];
}

export function roundScene({
  roundNumber,
  winners,
  revealed,
  animating,
  sequential,
  sample,
}: RoundProgress): StageScene {
  const total = winners.length;
  const current = animating === null ? undefined : winners[animating];
  if (animating !== null && current) {
    // Um a um: uma roleta por vez. Em lista: todas as roletas ao mesmo tempo.
    const spinning = sequential ? [current] : winners.slice(0, REEL_LIMIT);
    return {
      phase: "reel",
      id: `${String(roundNumber)}:${String(animating)}`,
      names: sample,
      winners: spinning.map((winner) => winner.name),
      total: spinning.length === 1 ? 1 : total,
      label: sequential
        ? `Vencedor ${String(animating + 1)} de ${String(total)} · sorteando`
        : "Sorteando",
      pace: sequential ? "quick" : "normal",
    };
  }

  const shown = Math.min(revealed, total);
  if (total === 1 || (sequential && shown < total)) {
    return {
      phase: "single",
      heading: total === 1 ? "Parabéns!" : `Vencedor ${String(shown)} de ${String(total)}`,
      name: winners[shown - 1]?.name ?? "",
    };
  }
  return {
    phase: "grid",
    winners: winners
      .slice(0, Math.min(shown, GRID_LIMIT))
      .map(({ position, name }) => ({ position, name })),
    total,
  };
}

import { useCallback, useState } from "react";
import type { RevealMode } from "~/features/session/model";

export interface RevealControls {
  /** Quantos vencedores já estão visíveis (na ordem do sorteio). */
  revealed: number;
  /** Índice do vencedor em animação, ou null. */
  animating: number | null;
  done: boolean;
  onAnimationDone: () => void;
  next: () => void;
  revealAll: () => void;
}

/**
 * Sequência de revelação. "compact": uma animação e a lista inteira. "sequential": um vencedor por
 * vez, no ritmo de quem apresenta. Sem `fresh` (ex.: vindo do histórico), tudo aparece de uma vez.
 * Todos os vencedores já foram definidos no clique em "Sortear": revelar é só apresentação.
 */
export function useReveal(total: number, mode: RevealMode, fresh: boolean): RevealControls {
  const [revealed, setRevealed] = useState(fresh ? 0 : total);
  const [animating, setAnimating] = useState<number | null>(fresh && total > 0 ? 0 : null);

  const onAnimationDone = useCallback(() => {
    setAnimating(null);
    setRevealed((count) => (mode === "compact" ? total : Math.min(total, count + 1)));
  }, [mode, total]);

  const next = useCallback(() => {
    if (revealed < total) setAnimating(revealed);
  }, [revealed, total]);

  const revealAll = useCallback(() => {
    setAnimating(null);
    setRevealed(total);
  }, [total]);

  return { revealed, animating, done: revealed >= total, onAnimationDone, next, revealAll };
}

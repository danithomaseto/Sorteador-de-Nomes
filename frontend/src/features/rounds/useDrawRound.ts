import { useCallback } from "react";
import { useNavigate } from "react-router";
import { poolSnapshot } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { api, type RoundRequest } from "~/lib/api/client";
import { useAsyncAction } from "~/lib/useAsyncAction";

export interface RevealState {
  reveal: true;
}

/**
 * Executa uma rodada: congela a lista de disponíveis, envia só o tamanho e a quantidade
 * (nenhum nome sai do navegador) e registra o resultado na sessão.
 */
export function useDrawRound() {
  const { state, dispatch } = useSession();
  const navigate = useNavigate();
  const request = useAsyncAction((signal, body: RoundRequest) => api.createRound(body, signal));

  const start = useCallback(
    async ({ showResult = true }: { showResult?: boolean } = {}): Promise<number | null> => {
      const pool = poolSnapshot(state);
      const { quantity, allowRepeat, removeWinners } = state.settings;
      const result = await request.run({
        pool_size: pool.length,
        quantity,
        allow_repeat: allowRepeat,
      });
      if (!result) return null;
      const number = state.rounds.length + 1;
      dispatch({
        type: "recordRound",
        pool,
        outcome: {
          positions: result.positions,
          drawnAt: result.drawn_at,
          algorithm: result.algorithm,
          quantity: result.quantity,
          allowRepeat: result.allow_repeat,
        },
        removeWinners,
      });
      if (showResult) {
        const reveal: RevealState = { reveal: true };
        void navigate(`/sorteio/rodadas/${String(number)}`, { state: reveal });
      }
      return number;
    },
    [dispatch, navigate, request, state],
  );

  return {
    start,
    pending: request.pending,
    error: request.status === "error" ? request.error : null,
    resetError: request.reset,
  };
}

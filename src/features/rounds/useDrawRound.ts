import { useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import type { SessionState } from "~/features/session/model";
import { drawBlocker, poolSnapshot } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { CryptoRandomSource, drawPositions } from "~/services/draw";

export interface RevealState {
  reveal: true;
}

const random = new CryptoRandomSource();

/**
 * Executa uma rodada no próprio navegador: congela a lista de disponíveis, sorteia posições com o
 * gerador criptográfico e registra o resultado na sessão. Nenhum dado sai do dispositivo.
 */
export function useDrawRound() {
  const { state, dispatch } = useSession();
  const navigate = useNavigate();
  // Evita duas rodadas com a mesma lista se o comando chegar duas vezes antes de a sessão
  // atualizar (ex.: tecla pressionada duas vezes no modo apresentação).
  const startedWith = useRef<SessionState["rounds"] | null>(null);

  const start = useCallback(
    ({ showResult = true }: { showResult?: boolean } = {}): number | null => {
      if (startedWith.current === state.rounds || drawBlocker(state) !== null) return null;
      startedWith.current = state.rounds;
      const number = state.rounds.length + 1;

      const pool = poolSnapshot(state);
      const { quantity, allowRepeat, removeWinners } = state.settings;
      const outcome = drawPositions(pool.length, quantity, { allowRepeat, random });
      dispatch({
        type: "recordRound",
        pool,
        outcome: {
          positions: outcome.positions,
          drawnAt: new Date().toISOString(),
          algorithm: outcome.algorithm,
          quantity,
          allowRepeat,
        },
        removeWinners,
      });
      if (showResult) {
        const reveal: RevealState = { reveal: true };
        void navigate(`/sorteio/rodadas/${String(number)}`, { state: reveal });
      }
      return number;
    },
    [dispatch, navigate, state],
  );

  return { start };
}

import { useEffect, useMemo } from "react";
import { animationSample } from "~/features/rounds/animationSample";
import { useReveal } from "~/features/rounds/useReveal";
import type { Round } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import { useAnnounce } from "~/utils/a11y/Announcer";
import { roundScene, type StageScene as Scene } from "./scene";
import { StageScene } from "./StageScene";

interface PresentationRoundProps {
  round: Round;
  drawName: string;
  /** Informa ao palco qual é a ação principal agora (Espaço/Enter). */
  onPrimaryChange: (action: (() => void) | null, label: string | null) => void;
  /** Cena atual, para o telão acompanhar. */
  onSceneChange: (scene: Scene) => void;
  onFinished: () => void;
}

export function PresentationRound({
  round,
  drawName,
  onPrimaryChange,
  onSceneChange,
  onFinished,
}: PresentationRoundProps) {
  const { state } = useSession();
  const announce = useAnnounce();
  const total = round.winners.length;
  const reveal = useReveal(total, state.settings.revealMode, true);
  const sample = useMemo(
    () => animationSample(state.participants.map((p) => p.name)),
    [state.participants],
  );
  const sequential = state.settings.revealMode === "sequential" && total > 1;
  const scene = useMemo(
    () =>
      roundScene({
        roundNumber: round.number,
        winners: round.winners,
        revealed: reveal.revealed,
        animating: reveal.animating,
        sequential,
        sample,
      }),
    [reveal.animating, reveal.revealed, round, sample, sequential],
  );

  useEffect(() => {
    onSceneChange(scene);
  }, [onSceneChange, scene]);

  useEffect(() => {
    if (reveal.animating === null && !reveal.done) {
      onPrimaryChange(
        reveal.next,
        `Revelar próximo (${String(reveal.revealed + 1)} de ${String(total)})`,
      );
    } else if (reveal.animating !== null) {
      onPrimaryChange(null, null);
    }
  }, [onPrimaryChange, reveal.animating, reveal.done, reveal.next, reveal.revealed, total]);

  useEffect(() => {
    if (!reveal.done) return;
    const names = round.winners.slice(0, 10).map((w) => w.name);
    announce(
      total === 1
        ? `Parabéns, ${names[0] ?? ""}!`
        : `Vencedores da rodada ${String(round.number)}: ${names.join(", ")}${total > 10 ? " e outros" : ""}.`,
    );
    onFinished();
  }, [announce, onFinished, reveal.done, round, total]);

  return <StageScene scene={scene} drawName={drawName} onReelDone={reveal.onAnimationDone} />;
}

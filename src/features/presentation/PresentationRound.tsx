import { useEffect, useMemo } from "react";
import { cx } from "~/components/cx";
import { animationSample } from "~/features/rounds/animationSample";
import { DrawReel } from "~/features/rounds/DrawReel";
import { useReveal } from "~/features/rounds/useReveal";
import type { Round } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import { useAnnounce } from "~/utils/a11y/Announcer";
import { ordinal } from "~/services/export";
import styles from "./PresentationRound.module.css";

const GRID_LIMIT = 30;

interface PresentationRoundProps {
  round: Round;
  /** Informa ao palco qual é a ação principal agora (Espaço/Enter). */
  onPrimaryChange: (action: (() => void) | null, label: string | null) => void;
  onFinished: () => void;
}

function nameSize(name: string): string | undefined {
  if (name.length > 40) return styles.long;
  if (name.length > 22) return styles.medium;
  return undefined;
}

export function PresentationRound({ round, onPrimaryChange, onFinished }: PresentationRoundProps) {
  const { state } = useSession();
  const announce = useAnnounce();
  const total = round.winners.length;
  const reveal = useReveal(total, state.settings.revealMode, true);
  const sample = useMemo(
    () => animationSample(state.participants.map((p) => p.name)),
    [state.participants],
  );
  const animating = reveal.animating !== null ? round.winners[reveal.animating] : undefined;
  const sequential = state.settings.revealMode === "sequential" && total > 1;

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

  if (animating) {
    return (
      <div className={styles.center}>
        <DrawReel
          key={reveal.animating}
          names={sample}
          finalName={animating.name}
          label={
            sequential
              ? `Vencedor ${String((reveal.animating ?? 0) + 1)} de ${String(total)} · sorteando`
              : "Sorteando"
          }
          pace={sequential ? "quick" : "normal"}
          size="xl"
          onDone={reveal.onAnimationDone}
        />
      </div>
    );
  }

  const visible = round.winners.slice(0, reveal.revealed);
  if (total === 1 || (sequential && !reveal.done)) {
    const winner = visible.at(-1);
    return (
      <div className={styles.center}>
        <p className={styles.congrats}>
          {total === 1 ? "Parabéns!" : `Vencedor ${String(visible.length)} de ${String(total)}`}
        </p>
        <p className={cx(styles.winner, winner && nameSize(winner.name))}>{winner?.name}</p>
      </div>
    );
  }

  const shown = visible.slice(0, GRID_LIMIT);
  return (
    <div className={styles.center}>
      <p className={styles.congrats}>Parabéns!</p>
      <ol
        role="list"
        className={cx(styles.grid, total <= 3 && styles.few, total > 10 && styles.many)}
      >
        {shown.map((winner) => (
          <li key={winner.position} className={styles.cell}>
            <span className={styles.position}>{ordinal(winner.position)}</span>
            <span className={styles.cellName}>{winner.name}</span>
          </li>
        ))}
      </ol>
      {total > GRID_LIMIT ? (
        <p className={styles.more}>e mais {total - GRID_LIMIT} — veja todos no resultado.</p>
      ) : null}
    </div>
  );
}

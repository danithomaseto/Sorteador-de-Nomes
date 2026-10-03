import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import styles from "./DrawAnimation.module.css";

type Pace = "normal" | "quick";

const PACES: Record<Pace, { fastMs: number; frameMs: number; slowdown: readonly number[] }> = {
  normal: { fastMs: 1200, frameMs: 70, slowdown: [80, 110, 150, 200, 260, 330, 420] },
  quick: { fastMs: 600, frameMs: 70, slowdown: [90, 130, 180, 240, 310] },
};

interface DrawAnimationProps {
  /** Amostra cosmética (ver animationSample). */
  names: readonly string[];
  /** O vencedor real, já definido pelo servidor. A animação sempre termina nele. */
  finalName: string;
  pace?: Pace;
  size?: "md" | "xl";
  onDone: () => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Nomes passando rápido, desacelerando até o vencedor. É só apresentação: o resultado já está
 * registrado. Leitores de tela não ouvem os nomes intermediários (aria-hidden).
 */
export function DrawAnimation({
  names,
  finalName,
  pace = "normal",
  size = "md",
  onDone,
}: DrawAnimationProps) {
  const [frame, setFrame] = useState<{ text: string; tick: number; final: boolean }>({
    text: names[0] ?? finalName,
    tick: 0,
    final: false,
  });
  const onDoneRef = useRef(onDone);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    timers.current = [];
    const finish = () => {
      setFrame((current) => ({ text: finalName, tick: current.tick + 1, final: true }));
      timers.current.push(
        window.setTimeout(() => onDoneRef.current(), prefersReducedMotion() ? 200 : 450),
      );
    };
    if (prefersReducedMotion() || names.length === 0) {
      finish();
      return () => {
        timers.current.forEach((t) => {
          window.clearTimeout(t);
        });
      };
    }

    const { fastMs, frameMs, slowdown } = PACES[pace];
    let elapsed = 0;
    let index = 0;
    const next = () => {
      index = (index + 1) % names.length;
      setFrame((current) => ({
        text: names[index] ?? finalName,
        tick: current.tick + 1,
        final: false,
      }));
    };
    while (elapsed < fastMs) {
      elapsed += frameMs;
      timers.current.push(window.setTimeout(next, elapsed));
    }
    for (const step of slowdown) {
      elapsed += step;
      timers.current.push(window.setTimeout(next, elapsed));
    }
    timers.current.push(window.setTimeout(finish, elapsed + (slowdown.at(-1) ?? frameMs)));

    const scheduled = timers.current;
    return () => {
      scheduled.forEach((t) => {
        window.clearTimeout(t);
      });
    };
  }, [finalName, names, pace]);

  function skip() {
    timers.current.forEach((t) => {
      window.clearTimeout(t);
    });
    timers.current = [];
    onDoneRef.current();
  }

  return (
    <div className={cx(styles.stage, styles[size])}>
      <p
        className={cx(styles.name, frame.final && styles.final)}
        aria-hidden="true"
        key={frame.tick}
      >
        {frame.text}
      </p>
      <p className="visually-hidden" role="status">
        {frame.final ? "" : "Sorteando…"}
      </p>
      {!frame.final ? (
        <Button variant="ghost" size="sm" className={styles.skip} onClick={skip}>
          Pular animação
        </Button>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import styles from "./DrawReel.module.css";

type Pace = "normal" | "quick";

const PACES: Record<Pace, { rows: number; durationMs: number; holdMs: number }> = {
  normal: { rows: 34, durationMs: 2600, holdMs: 700 },
  quick: { rows: 16, durationMs: 1300, holdMs: 450 },
};
// Linhas visíveis acima e abaixo da faixa central.
const ROWS_AROUND = 2;
// Começa rápido e desacelera longamente até parar, como um rolo mecânico.
const EASING = "cubic-bezier(0.12, 0.6, 0.1, 1)";

interface DrawReelProps {
  /** Amostra cosmética de nomes (ver `animationSample`). */
  names: readonly string[];
  /** O vencedor, já sorteado e registrado. O rolo sempre para nele. */
  finalName: string;
  /** Texto acima do rolo, ex.: "Vencedor 2 de 5". */
  label?: string;
  pace?: Pace;
  size?: "md" | "xl";
  onDone: () => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Nomes da faixa: amostra repetida até o tamanho do rolo, o vencedor e duas linhas depois. */
function buildStrip(names: readonly string[], finalName: string, rows: number): string[] {
  const filler = names.length > 0 ? names : [finalName];
  const pick = (index: number) => filler[index % filler.length] ?? finalName;
  const before = Array.from({ length: rows }, (_, index) => pick(index));
  const after = Array.from({ length: ROWS_AROUND }, (_, index) => pick(rows + index + 1));
  return [...before, finalName, ...after];
}

/**
 * Palco do sorteio: um rolo de nomes que desacelera até parar no vencedor. É só apresentação —
 * o resultado já foi sorteado e registrado antes de a animação começar. Leitores de tela ouvem
 * "Sorteando…" e depois o resultado, nunca os nomes intermediários.
 */
export function DrawReel({
  names,
  finalName,
  label = "Sorteando",
  pace = "normal",
  size = "md",
  onDone,
}: DrawReelProps) {
  const stripRef = useRef<HTMLOListElement>(null);
  const timer = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  const [landed, setLanded] = useState(false);
  const { rows, durationMs, holdMs } = PACES[pace];
  const strip = useMemo(() => buildStrip(names, finalName, rows), [finalName, names, rows]);
  const winnerIndex = rows;

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback((delay: number) => {
    setLanded(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onDoneRef.current();
    }, delay);
  }, []);

  useEffect(() => {
    const list = stripRef.current;
    if (!list) return undefined;
    const rowHeight = list.firstElementChild?.getBoundingClientRect().height ?? 0;
    const distance = (winnerIndex - ROWS_AROUND) * rowHeight;
    const reduced = prefersReducedMotion();
    if (reduced || typeof list.animate !== "function") {
      // Sem movimento: o rolo já aparece parado no vencedor.
      list.style.transform = `translateY(${String(-distance)}px)`;
      finish(reduced ? 200 : holdMs);
      return undefined;
    }
    const animation = list.animate(
      [{ transform: "translateY(0)" }, { transform: `translateY(${String(-distance)}px)` }],
      { duration: durationMs, easing: EASING, fill: "forwards" },
    );
    animation.finished.then(
      () => {
        finish(holdMs);
      },
      () => undefined, // cancelada ao sair da tela ou ao pular
    );
    return () => {
      animation.cancel();
    };
  }, [durationMs, finish, holdMs, winnerIndex]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function skip() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    onDoneRef.current();
  }

  return (
    <div className={cx(styles.stage, styles[size], landed && styles.landed)}>
      <p className={styles.label} aria-hidden="true">
        {landed ? "Vencedor" : `${label}…`}
      </p>
      <div className={styles.window} aria-hidden="true">
        <span className={styles.band} />
        <ol className={styles.strip} ref={stripRef}>
          {strip.map((name, index) => (
            <li
              // A faixa é fixa durante a animação: a posição identifica cada linha.
              key={index}
              className={cx(styles.row, index === winnerIndex && styles.winner)}
            >
              {name}
            </li>
          ))}
        </ol>
      </div>
      <p className="visually-hidden" role="status">
        {landed ? "" : "Sorteando…"}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className={cx(styles.skip, landed && styles.hidden)}
        tabIndex={landed ? -1 : undefined}
        onClick={skip}
      >
        Pular animação
      </Button>
    </div>
  );
}

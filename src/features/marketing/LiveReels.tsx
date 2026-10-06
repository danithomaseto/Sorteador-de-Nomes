import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cx } from "~/components/cx";
import { prefersReducedMotion, useInView, usePageVisible } from "~/utils/motion";
import { DEMO_NAMES, type DemoReel, type DemoRound } from "./demoNames";
import styles from "./LiveReels.module.css";

// Mesmo ritmo do sorteio de verdade: começa rápido, desacelera e para em cascata.
const SPIN_MS = 2400;
const STAGGER_MS = 170;
const HOLD_MS = 3800;
const FIRST_SPIN_DELAY_MS = 900;
const FILLER_ROWS = 18;
const EASING = "cubic-bezier(0.12, 0.6, 0.1, 1)";
const NO_REELS: DemoRound = [];

type Phase = "idle" | "spinning";

interface LiveReelsProps {
  /** Rodadas em sequência; a primeira é a que aparece parada no HTML pré-renderizado. */
  rounds: readonly DemoRound[];
  size?: "hero" | "tile";
  /** Texto à direita do rótulo, ex.: "Rodada 2 · 10 de 127". Recebe o número da rodada. */
  meta?: (round: number) => string;
  caption?: string;
}

function block(reel: DemoReel): string[] {
  return [reel.above, ...reel.winners, reel.below];
}

/**
 * Roletas de demonstração que giram sozinhas, em laço, como no sorteio. Decorativas (ocultas para
 * leitores de tela). Paradas com "reduzir movimento", fora da tela ou com a aba em segundo plano.
 */
export function LiveReels({ rounds, size = "hero", meta, caption }: LiveReelsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stripRefs = useRef<(HTMLOListElement | null)[]>([]);
  const animations = useRef<Animation[]>([]);
  const inView = useInView(rootRef, { threshold: 0.3 });
  const pageVisible = usePageVisible();
  const [round, setRound] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [count, setCount] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [landed, setLanded] = useState<ReadonlySet<number>>(() => new Set());

  const current = rounds[round % rounds.length] ?? NO_REELS;
  // Gira até a última roleta parar; antes do primeiro giro, tudo aparece parado.
  const spinning = phase === "spinning" && landed.size < current.length;
  const before = previous === null ? null : (rounds[previous % rounds.length] ?? null);
  const rows = current[0]?.winners.length ?? 1;

  // Faixa de cada roleta: a rodada anterior no topo (de onde a roleta "continua"), nomes de
  // passagem e a rodada atual no fim. Antes do primeiro giro, só a rodada atual.
  const strips = useMemo(
    () =>
      current.map((reel, column) => {
        if (!before) return { names: block(reel), offset: 0 };
        const start = before[column];
        const head = start ? block(start) : [];
        const filler = Array.from(
          { length: FILLER_ROWS + column * 3 },
          (_, i) => DEMO_NAMES[(count * 11 + column * 7 + i) % DEMO_NAMES.length] ?? "",
        );
        return { names: [...head, ...filler, ...block(reel)], offset: head.length + filler.length };
      }),
    [before, count, current],
  );

  // Próximo giro: depois de um tempo parado, só com as roletas visíveis.
  useEffect(() => {
    if (spinning || !inView || !pageVisible || prefersReducedMotion()) {
      return undefined;
    }
    const timer = window.setTimeout(
      () => {
        setPrevious(round);
        setRound(round + 1);
        setCount(count + 1);
        setLanded(new Set());
        setPhase("spinning");
      },
      previous === null ? FIRST_SPIN_DELAY_MS : HOLD_MS,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [count, inView, pageVisible, previous, round, spinning]);

  // O giro: cada roleta desliza até a rodada nova e para um pouco depois da anterior. Roda antes
  // da pintura, então a troca de conteúdo da faixa nunca aparece.
  useLayoutEffect(() => {
    if (phase !== "spinning") return;
    for (const animation of animations.current) animation.cancel();
    animations.current = [];
    const land = (column: number) => {
      setLanded((done) => new Set(done).add(column));
    };
    strips.forEach((strip, column) => {
      const list = stripRefs.current[column];
      if (!list || typeof list.animate !== "function") {
        land(column);
        return;
      }
      const rowHeight = list.firstElementChild?.getBoundingClientRect().height ?? 0;
      const animation = list.animate(
        [
          { transform: "translateY(0)" },
          { transform: `translateY(${String(-strip.offset * rowHeight)}px)` },
        ],
        { duration: SPIN_MS + column * STAGGER_MS, easing: EASING, fill: "forwards" },
      );
      animation.finished.then(
        () => {
          land(column);
        },
        () => undefined, // cancelada ao começar outro giro ou ao sair da página
      );
      animations.current.push(animation);
    });
  }, [phase, strips]);

  useEffect(
    () => () => {
      for (const animation of animations.current) animation.cancel();
    },
    [],
  );

  return (
    <div ref={rootRef} className={cx(styles.stage, styles[size])} aria-hidden="true">
      <div className={styles.head}>
        <p className={styles.label}>{spinning ? "Sorteando…" : "Vencedores"}</p>
        {meta ? <p className={styles.meta}>{meta(count)}</p> : null}
      </div>
      <div className={cx(styles.reels, styles[`rows${String(rows)}`])}>
        {strips.map((strip, column) => {
          const reelLanded = !spinning || landed.has(column);
          const firstWinner = strip.names.length - 1 - rows;
          return (
            <div key={column} className={cx(styles.reel, reelLanded && styles.landed)}>
              {Array.from({ length: rows }, (_, slot) => (
                <span key={slot} className={cx(styles.band, styles[`slot${String(slot + 1)}`])} />
              ))}
              <ol
                className={styles.strip}
                ref={(element) => {
                  stripRefs.current[column] = element;
                }}
              >
                {strip.names.map((name, index) => (
                  <li
                    // A faixa é fixa durante o giro: a posição identifica cada linha.
                    key={index}
                    className={cx(
                      styles.row,
                      index >= firstWinner && index < firstWinner + rows && styles.winner,
                    )}
                  >
                    {name}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import { cssVars } from "~/utils/cssVars";
import { formatNumber } from "~/utils/format";
import styles from "./DrawReel.module.css";
import { maxReelColumns, reelLayout, reelSlots, type ReelLayout } from "./reelLayout";

type Pace = "normal" | "quick";
type Size = "md" | "xl";

const PACES: Record<Pace, { rows: number; durationMs: number; holdMs: number }> = {
  normal: { rows: 34, durationMs: 2600, holdMs: 900 },
  quick: { rows: 16, durationMs: 1300, holdMs: 450 },
};
// Largura mínima de cada roleta e linhas por roleta, por tamanho do palco.
const LIMITS: Record<Size, { minWidth: number; maxRows: number }> = {
  md: { minWidth: 172, maxRows: 5 },
  xl: { minWidth: 220, maxRows: 4 },
};
// As roletas param da esquerda para a direita, no máximo 1 s depois da primeira.
const MAX_STAGGER_MS = 180;
const TOTAL_STAGGER_MS = 1000;
// Começa rápido e desacelera longamente até parar, como um rolo mecânico.
const EASING = "cubic-bezier(0.12, 0.6, 0.1, 1)";
const FALLBACK_WIDTH = 960;

interface DrawReelProps {
  /** Amostra cosmética de nomes (ver `animationSample`). */
  names: readonly string[];
  /** Os vencedores, já sorteados e registrados, na ordem do sorteio. As roletas param neles. */
  winners: readonly string[];
  /** Total de vencedores da rodada, quando `winners` traz só os primeiros. */
  total?: number;
  /** Texto acima das roletas enquanto giram, ex.: "Vencedor 2 de 5 · sorteando". */
  label?: string;
  pace?: Pace;
  size?: Size;
  /** Sem o botão "Pular animação" (ex.: no telão, que só acompanha o modo apresentação). */
  skippable?: boolean;
  onDone: () => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Linhas visíveis acima e abaixo das faixas: mais contexto quando há uma faixa só. */
function contextRows(rows: number): number {
  return rows === 1 ? 2 : 1;
}

interface Reel {
  /** Nomes da faixa: amostra, as linhas dos vencedores e o contexto final. */
  strip: string[];
  /** Índice, na faixa, da primeira linha de vencedores. */
  firstSlot: number;
  slots: (number | null)[];
  durationMs: number;
}

function buildReels(
  layout: ReelLayout,
  names: readonly string[],
  winners: readonly string[],
  pace: Pace,
): Reel[] {
  const { rows: baseRows, durationMs } = PACES[pace];
  const context = contextRows(layout.rows);
  const stagger =
    layout.columns > 1 ? Math.min(MAX_STAGGER_MS, TOTAL_STAGGER_MS / (layout.columns - 1)) : 0;
  const filler = names.length > 0 ? names : winners;
  const pick = (index: number) => filler[index % filler.length] ?? "";

  return reelSlots(layout).map((slots, column) => {
    // Roletas que param depois percorrem mais linhas, na mesma velocidade.
    const fillerRows = baseRows + column * 3;
    // Cada roleta começa num ponto diferente da amostra.
    const offset = column * 7;
    const before = Array.from({ length: fillerRows }, (_, i) => pick(offset + i));
    const slotNames = slots.map((index) => (index === null ? "" : (winners[index] ?? "")));
    const after = Array.from({ length: context }, (_, i) => pick(offset + fillerRows + i + 1));
    return {
      strip: [...before, ...slotNames, ...after],
      firstSlot: fillerRows,
      slots,
      durationMs: durationMs + column * stagger,
    };
  });
}

/**
 * Palco do sorteio: roletas de nomes que desaceleram até parar nos vencedores — uma roleta por
 * vencedor, ou várias faixas por roleta quando são muitos (10 = 5 roletas com 2). É só
 * apresentação: o resultado já foi sorteado e registrado antes de a animação começar. Leitores de
 * tela ouvem "Sorteando…" e depois o resultado, nunca os nomes intermediários.
 */
export function DrawReel({
  names: initialNames,
  winners: initialWinners,
  total,
  label = "Sorteando",
  pace = "normal",
  size = "md",
  skippable = true,
  onDone,
}: DrawReelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  // As roletas são fixas durante a animação: novas cópias dos mesmos dados (ex.: o telão recebendo
  // a cena de novo) não podem reiniciá-la. Uma nova animação usa uma nova `key`.
  const [{ names, winners }] = useState(() => ({
    names: initialNames,
    winners: initialWinners,
  }));

  // A distribuição é decidida uma vez, pela largura disponível no início da animação.
  useLayoutEffect(() => {
    const measured = rootRef.current?.getBoundingClientRect().width ?? 0;
    setWidth(measured > 0 ? measured : FALLBACK_WIDTH);
  }, []);

  const layout = useMemo(
    () =>
      reelLayout(winners.length, {
        maxColumns: maxReelColumns(width ?? FALLBACK_WIDTH, LIMITS[size].minWidth),
        maxRows: LIMITS[size].maxRows,
      }),
    [size, width, winners.length],
  );

  return (
    <div
      ref={rootRef}
      className={cx(styles.stage, styles[size], layout.columns > 1 && styles.multi)}
    >
      {width === null ? null : (
        <Reels
          layout={layout}
          names={names}
          winners={winners}
          total={total ?? winners.length}
          label={label}
          pace={pace}
          skippable={skippable}
          onDone={onDone}
        />
      )}
    </div>
  );
}

interface ReelsProps extends Required<Omit<DrawReelProps, "size">> {
  layout: ReelLayout;
}

function Reels({ layout, names, winners, total, label, pace, skippable, onDone }: ReelsProps) {
  const reels = useMemo(
    () => buildReels(layout, names, winners, pace),
    [layout, names, pace, winners],
  );
  const stripRefs = useRef<(HTMLOListElement | null)[]>([]);
  const timer = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  const [landed, setLanded] = useState<ReadonlySet<number>>(() => new Set());
  const { holdMs } = PACES[pace];
  const context = contextRows(layout.rows);
  const allLanded = landed.size === reels.length;

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const finish = useCallback((delay: number) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onDoneRef.current();
    }, delay);
  }, []);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const animations: Animation[] = [];
    let remaining = reels.length;
    const land = (column: number) => {
      setLanded((current) => new Set(current).add(column));
      remaining -= 1;
      if (remaining === 0) finish(reduced ? 200 : holdMs);
    };

    reels.forEach((reel, column) => {
      const list = stripRefs.current[column];
      if (!list) return;
      const rowHeight = list.firstElementChild?.getBoundingClientRect().height ?? 0;
      const distance = (reel.firstSlot - context) * rowHeight;
      if (reduced || typeof list.animate !== "function") {
        // Sem movimento: as roletas já aparecem paradas nos vencedores.
        list.style.transform = `translateY(${String(-distance)}px)`;
        land(column);
        return;
      }
      const animation = list.animate(
        [{ transform: "translateY(0)" }, { transform: `translateY(${String(-distance)}px)` }],
        { duration: reel.durationMs, easing: EASING, fill: "forwards" },
      );
      animations.push(animation);
      animation.finished.then(
        () => {
          land(column);
        },
        () => undefined, // cancelada ao sair da tela ou ao pular
      );
    });
    return () => {
      animations.forEach((animation) => {
        animation.cancel();
      });
    };
  }, [context, finish, holdMs, reels]);

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

  const heading = allLanded
    ? total === 1
      ? "Vencedor"
      : "Vencedores"
    : total > 1 && label === "Sorteando"
      ? `Sorteando ${formatNumber(total)} vencedores…`
      : `${label}…`;

  return (
    <>
      <p className={styles.label} aria-hidden="true">
        {heading}
      </p>
      <div
        className={styles.bank}
        style={cssVars({
          "--reel-columns": layout.columns,
          "--reel-rows": layout.rows + context * 2,
        })}
        aria-hidden="true"
      >
        {reels.map((reel, column) => (
          <div
            key={column}
            className={cx(styles.reel, landed.has(column) && styles.landed)}
            style={cssVars({ "--reel-context": context })}
          >
            <div className={styles.window}>
              {reel.slots.map((index, row) =>
                index === null ? null : (
                  <span
                    key={row}
                    className={styles.band}
                    style={cssVars({ "--reel-slot": row + context })}
                  />
                ),
              )}
              <ol
                className={styles.strip}
                ref={(element) => {
                  stripRefs.current[column] = element;
                }}
              >
                {reel.strip.map((name, index) => (
                  <li
                    // A faixa é fixa durante a animação: a posição identifica cada linha.
                    key={index}
                    className={cx(
                      styles.row,
                      index >= reel.firstSlot &&
                        index < reel.firstSlot + layout.rows &&
                        name !== "" &&
                        styles.winner,
                    )}
                  >
                    {name}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
      {layout.shown < total ? (
        <p className={styles.more} aria-hidden="true">
          Na tela, os {formatNumber(layout.shown)} primeiros. A lista completa aparece em seguida.
        </p>
      ) : null}
      <p className="visually-hidden" role="status">
        {allLanded ? "" : "Sorteando…"}
      </p>
      {skippable ? (
        <Button
          variant="ghost"
          size="sm"
          className={cx(styles.skip, allLanded && styles.hidden)}
          tabIndex={allLanded ? -1 : undefined}
          onClick={skip}
        >
          Pular animação
        </Button>
      ) : null}
    </>
  );
}

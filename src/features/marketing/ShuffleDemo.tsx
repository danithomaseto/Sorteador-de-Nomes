import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import { CryptoRandomSource } from "~/services/draw/random";
import { ordinal } from "~/services/export";
import { prefersReducedMotion, useInView } from "~/utils/motion";
import styles from "./ShuffleDemo.module.css";

const NAMES = ["Ana", "Bruno", "Carla", "Davi", "Eva", "Fábio", "Gil", "Hana"] as const;
const WINNERS = 3;
const INITIAL = NAMES.map((_, index) => index);
const SCAN_STEPS = 7;
const SCAN_MS = 85;
const SWAP_MS = 480;
const PAUSE_MS = 420;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

const random = new CryptoRandomSource();

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Demonstração do método (Fisher–Yates parcial), com o mesmo gerador criptográfico do sorteio: a
 * cada passo, a posição atual troca de lugar com uma posição sorteada entre as que ainda não
 * foram fixadas; as primeiras posições viram os vencedores.
 */
export function ShuffleDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<number, HTMLLIElement>());
  const lastRects = useRef(new Map<number, DOMRect>());
  const runId = useRef(0);
  const inView = useInView(rootRef, { once: true, threshold: 0.5 });
  const [order, setOrder] = useState<readonly number[]>(INITIAL);
  const [fixed, setFixed] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const run = useCallback(async () => {
    const id = (runId.current += 1);
    const alive = () => runId.current === id;
    const reduced = prefersReducedMotion();
    let current = [...INITIAL];
    setRunning(true);
    setAnnouncement("");
    setOrder(current);
    setFixed(0);
    if (!reduced) await wait(PAUSE_MS);

    for (let i = 0; i < WINNERS && alive(); i += 1) {
      const j = i + random.randomBelow(current.length - i);
      if (!reduced) {
        // Varredura: o destaque passa por posições ainda livres antes de parar na sorteada.
        for (let hop = 0; hop < SCAN_STEPS && alive(); hop += 1) {
          setCursor(i + random.randomBelow(current.length - i));
          await wait(SCAN_MS + hop * 12);
        }
        setCursor(j);
        setStep(
          i === j
            ? `Passo ${String(i + 1)}: a posição ${String(i + 1)} foi sorteada e fica onde está.`
            : `Passo ${String(i + 1)}: troca a posição ${String(i + 1)} com a ${String(j + 1)}.`,
        );
        await wait(PAUSE_MS);
      }
      const next = [...current];
      const atI = next[i] ?? 0;
      next[i] = next[j] ?? 0;
      next[j] = atI;
      current = next;
      setOrder(next);
      setCursor(null);
      if (!reduced) await wait(SWAP_MS);
      setFixed(i + 1);
      if (!reduced) await wait(PAUSE_MS);
    }
    if (!alive()) return;
    const winners = current.slice(0, WINNERS).map((index) => NAMES[index] ?? "");
    setStep(`Vencedores: ${winners.join(", ")}.`);
    setAnnouncement(`Resultado da demonstração: ${winners.join(", ")}.`);
    setRunning(false);
  }, []);

  // Roda sozinha na primeira vez que aparece na tela.
  useEffect(() => {
    if (!inView) return undefined;
    const timer = window.setTimeout(() => {
      void run();
    }, 200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [inView, run]);

  useEffect(
    () => () => {
      runId.current += 1; // interrompe uma demonstração em andamento ao sair da página
    },
    [],
  );

  // Troca de lugar animada (FLIP): cada nome desliza da posição antiga para a nova.
  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    const rects = new Map<number, DOMRect>();
    for (const [chip, element] of chipRefs.current) {
      const rect = element.getBoundingClientRect();
      rects.set(chip, rect);
      const before = lastRects.current.get(chip);
      if (reduced || !before || typeof element.animate !== "function") continue;
      const dx = before.left - rect.left;
      const dy = before.top - rect.top;
      if (dx === 0 && dy === 0) continue;
      element.animate(
        [{ transform: `translate(${String(dx)}px, ${String(dy)}px)` }, { transform: "none" }],
        { duration: SWAP_MS, easing: EASING },
      );
    }
    lastRects.current = rects;
  }, [order]);

  return (
    <div ref={rootRef} className={styles.demo} role="group" aria-label="Demonstração do método">
      <ol className={styles.chips} aria-hidden="true">
        {order.map((chip, position) => {
          const winner = position < fixed;
          return (
            <li
              key={chip}
              ref={(element) => {
                if (element) chipRefs.current.set(chip, element);
                else chipRefs.current.delete(chip);
              }}
              className={cx(
                styles.chip,
                winner && styles.winner,
                cursor === position && styles.cursor,
              )}
            >
              <span className={styles.position}>
                {winner ? ordinal(position + 1) : String(position + 1)}
              </span>
              <span className={styles.name}>{NAMES[chip]}</span>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>
        <p className={styles.step} aria-hidden="true">
          {step ?? "8 participantes, 3 vencedores."}
        </p>
        <Button
          size="sm"
          icon="shuffle"
          disabled={running}
          onClick={() => {
            void run();
          }}
        >
          Sortear de novo
        </Button>
      </div>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>
    </div>
  );
}

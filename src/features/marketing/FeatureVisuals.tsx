/**
 * Recortes da interface real para a página inicial (dados fictícios). Nada de ilustração: cada
 * bloco mostra como a função aparece no produto.
 */
import { useEffect, useRef, useState } from "react";
import { cx } from "~/components/cx";
import { prefersReducedMotion, useInView, usePageVisible } from "~/utils/motion";
import { demoRounds } from "./demoNames";
import styles from "./FeatureVisuals.module.css";
import { LiveReels } from "./LiveReels";
import { CountUp } from "./Motion";

// 6 vencedores por rodada: 3 roletas com 2 faixas.
const TILE_ROUNDS = demoRounds(3, 2, 4, 17);

/** Três roletas em funcionamento, dois vencedores em cada. */
export function ReelsVisual() {
  return <LiveReels rounds={TILE_ROUNDS} size="tile" />;
}

const SHEET = [
  ["Maria Souza", "maria@…", "Vendas"],
  ["João Silva", "joao@…", "TI"],
  ["Carlos Lima", "carlos@…", "RH"],
] as const;

/** Planilha com a coluna dos nomes escolhida. */
export function SheetVisual() {
  return (
    <div className={styles.sheet} aria-hidden="true">
      <div className={styles.sheetRow}>
        <span className={cx(styles.sheetHead, styles.picked)}>Nome</span>
        <span className={styles.sheetHead}>E-mail</span>
        <span className={styles.sheetHead}>Setor</span>
      </div>
      {SHEET.map((row) => (
        <div key={row[0]} className={styles.sheetRow}>
          {row.map((cell, index) => (
            <span key={cell} className={cx(styles.cell, index === 0 && styles.picked)}>
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

const SCREEN_NAMES = ["Maria Souza", "Heitor Campos", "Lívia Teles", "Theo Garcia", "Alice Moura"];
const ROLL_MS = 900;
const ROLL_STEP_MS = 80;
const SHOW_MS = 2600;

/**
 * Uma tela de projetor que sorteia em laço: os nomes passam rápido ("Sorteando…") e param num
 * vencedor ("Parabéns!"). Parada com "reduzir movimento" ou fora da tela.
 */
export function ScreenVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { threshold: 0.5 });
  const pageVisible = usePageVisible();
  const [winner, setWinner] = useState(0);
  const [rolling, setRolling] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || !pageVisible || prefersReducedMotion()) return undefined;
    let roll = 0;
    let step = 0;
    let timer = window.setTimeout(function next() {
      if (step * ROLL_STEP_MS < ROLL_MS) {
        roll = (roll + 2) % SCREEN_NAMES.length;
        setRolling(roll);
        step += 1;
        timer = window.setTimeout(next, ROLL_STEP_MS);
        return;
      }
      setRolling(null);
      setWinner((current) => (current + 1) % SCREEN_NAMES.length);
      step = 0;
      timer = window.setTimeout(next, SHOW_MS);
    }, SHOW_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [inView, pageVisible]);

  const name = SCREEN_NAMES[rolling ?? winner] ?? "";
  return (
    <div ref={rootRef} className={styles.screen} aria-hidden="true">
      <span className={styles.screenLabel}>{rolling === null ? "Parabéns!" : "Sorteando…"}</span>
      {rolling === null ? (
        <span key={`v${String(winner)}`} className={cx(styles.screenName, styles.landed)}>
          {name}
        </span>
      ) : (
        <span className={styles.screenRolling}>{name}</span>
      )}
    </div>
  );
}

const FORMATS = ["XLSX", "CSV", "TXT", "PDF", "PNG"] as const;

/** Formatos de exportação. */
export function FormatsVisual() {
  return (
    <ul role="list" className={styles.formats} aria-label="Formatos de exportação">
      {FORMATS.map((format) => (
        <li key={format} className={styles.format}>
          {format}
        </li>
      ))}
    </ul>
  );
}

/** Um número grande (que conta até o valor ao aparecer), com a unidade abaixo. */
export function FigureVisual({ value, unit }: { value: number; unit: string }) {
  return (
    <p className={styles.figure}>
      <CountUp value={value} className={styles.figureValue} />
      <span className={styles.figureUnit}>{unit}</span>
    </p>
  );
}

/**
 * Recortes da interface real para a página inicial (dados fictícios). Nada de ilustração: cada
 * bloco mostra como a função aparece no produto.
 */
import { cx } from "~/components/cx";
import styles from "./FeatureVisuals.module.css";

const MINI_REELS = [
  ["Rui Barros", "Maria Souza", "Bia Torres", "Igor Matos"],
  ["Ana Rocha", "João Silva", "Davi Nunes", "Nina Freire"],
  ["Luiza Prado", "Carlos Lima", "Lara Costa", "Tiago Melo"],
] as const;

/** Três roletas paradas em dois vencedores cada. */
export function ReelsVisual() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <p className={styles.stageLabel}>6 vencedores</p>
      <div className={styles.reels}>
        {MINI_REELS.map(([above, first, second, below]) => (
          <div key={first} className={styles.reel}>
            <span className={styles.context}>{above}</span>
            <span className={styles.band}>{first}</span>
            <span className={styles.band}>{second}</span>
            <span className={styles.context}>{below}</span>
          </div>
        ))}
      </div>
    </div>
  );
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

/** Uma tela de projetor com o vencedor. */
export function ScreenVisual() {
  return (
    <div className={styles.screen} aria-hidden="true">
      <span className={styles.screenLabel}>Parabéns!</span>
      <span className={styles.screenName}>Maria Souza</span>
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

/** Um número grande, com a unidade ao lado. */
export function FigureVisual({ value, unit }: { value: string; unit: string }) {
  return (
    <p className={styles.figure}>
      <span className={styles.figureValue}>{value}</span>
      <span className={styles.figureUnit}>{unit}</span>
    </p>
  );
}

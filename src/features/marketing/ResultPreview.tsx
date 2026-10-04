import { cx } from "~/components/cx";
import styles from "./ResultPreview.module.css";

const EXAMPLE = ["Maria Souza", "João Silva", "Carlos Lima"];

/** Ilustração feita com a própria interface: um exemplo de resultado (dados fictícios). */
export function ResultPreview() {
  return (
    <figure className={styles.figure}>
      <div className={styles.ticket} aria-hidden="true">
        <p className={styles.eyebrow}>Confraternização da equipe</p>
        <p className={styles.title}>Resultado · Rodada 1</p>
        <ol className={styles.list}>
          {EXAMPLE.map((name, index) => (
            <li key={name} className={cx(styles.row, index === 0 && styles.first)}>
              <span className={cx(styles.position, "numeric")}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{name}</span>
            </li>
          ))}
        </ol>
        <p className={styles.meta}>3 sorteados · 127 participavam · sem repetição</p>
      </div>
      <figcaption className="visually-hidden">
        Exemplo de resultado: três vencedores numerados de 01 a 03, com os dados da rodada.
      </figcaption>
    </figure>
  );
}

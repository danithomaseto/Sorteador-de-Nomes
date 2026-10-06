import { demoRounds } from "./demoNames";
import { LiveReels } from "./LiveReels";
import styles from "./ResultPreview.module.css";

// 10 vencedores por rodada, em 5 roletas com 2 faixas, como no sorteio de verdade.
const ROUNDS = demoRounds(5, 2, 3);

/** O palco do sorteio em funcionamento, com dados fictícios. */
export function ResultPreview() {
  return (
    <figure className={styles.figure}>
      <LiveReels
        rounds={ROUNDS}
        meta={(round) => `Rodada ${String(round)} · 10 de 127`}
        caption="Confraternização da equipe"
      />
      <figcaption className="visually-hidden">
        Exemplo de sorteio: cinco roletas param em dez vencedores, duas faixas por roleta.
      </figcaption>
    </figure>
  );
}

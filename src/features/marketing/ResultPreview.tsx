import styles from "./ResultPreview.module.css";

// Dados fictícios: três roletas paradas nos vencedores, como no sorteio de verdade.
const REELS = [
  { above: "Pedro Alves", winner: "Maria Souza", below: "Rafael Dias" },
  { above: "Ana Rocha", winner: "João Silva", below: "Beatriz Lopes" },
  { above: "Luiza Prado", winner: "Carlos Lima", below: "Tiago Melo" },
];

/** Ilustração feita com a própria interface: o palco do sorteio com três vencedores. */
export function ResultPreview() {
  return (
    <figure className={styles.figure}>
      <div className={styles.stage} aria-hidden="true">
        <p className={styles.label}>Vencedores</p>
        <div className={styles.reels}>
          {REELS.map((reel) => (
            <div key={reel.winner} className={styles.reel}>
              <span className={styles.context}>{reel.above}</span>
              <span className={styles.band}>{reel.winner}</span>
              <span className={styles.context}>{reel.below}</span>
            </div>
          ))}
        </div>
        <p className={styles.meta}>Confraternização da equipe · 3 de 127 participantes</p>
      </div>
      <figcaption className="visually-hidden">
        Exemplo de sorteio: três roletas paradas nos vencedores Maria Souza, João Silva e Carlos
        Lima.
      </figcaption>
    </figure>
  );
}

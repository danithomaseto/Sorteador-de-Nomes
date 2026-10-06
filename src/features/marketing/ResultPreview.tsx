import styles from "./ResultPreview.module.css";

// Dados fictícios: 10 vencedores em 5 roletas com 2 faixas, como no sorteio de verdade.
const REELS = [
  { above: "Pedro Alves", winners: ["Maria Souza", "Bia Torres"], below: "Rafael Dias" },
  { above: "Ana Rocha", winners: ["João Silva", "Davi Nunes"], below: "Beatriz Lopes" },
  { above: "Luiza Prado", winners: ["Carlos Lima", "Lara Costa"], below: "Tiago Melo" },
  { above: "Nina Freire", winners: ["Paula Reis", "Caio Mendes"], below: "Rui Barros" },
  { above: "Igor Matos", winners: ["Sofia Leal", "Enzo Pires"], below: "Clara Assis" },
];

/** Ilustração feita com a própria interface: o palco do sorteio com dez vencedores. */
export function ResultPreview() {
  return (
    <figure className={styles.figure}>
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.head}>
          <p className={styles.label}>Vencedores</p>
          <p className={styles.meta}>Rodada 1 · 10 de 127</p>
        </div>
        <div className={styles.reels}>
          {REELS.map((reel) => (
            <div key={reel.above} className={styles.reel}>
              <span className={styles.context}>{reel.above}</span>
              {reel.winners.map((name) => (
                <span key={name} className={styles.band}>
                  {name}
                </span>
              ))}
              <span className={styles.context}>{reel.below}</span>
            </div>
          ))}
        </div>
        <p className={styles.caption}>Confraternização da equipe</p>
      </div>
      <figcaption className="visually-hidden">
        Exemplo de sorteio: cinco roletas paradas em dez vencedores, duas faixas por roleta.
      </figcaption>
    </figure>
  );
}

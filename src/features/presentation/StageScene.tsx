import { cx } from "~/components/cx";
import { DrawReel } from "~/features/rounds/DrawReel";
import { ordinal } from "~/services/export";
import { GRID_LIMIT, type StageScene as Scene } from "./scene";
import styles from "./StageScene.module.css";

interface StageSceneProps {
  scene: Scene;
  drawName: string;
  /** Fim das roletas. No telão é só espelho: quem avança é o modo apresentação. */
  onReelDone?: () => void;
}

function nameSize(name: string): string | undefined {
  if (name.length > 40) return styles.long;
  if (name.length > 22) return styles.medium;
  return undefined;
}

function ignore() {
  // O telão espera a próxima cena do modo apresentação.
}

/** Desenha uma cena do palco. O mesmo componente atende o modo apresentação e o telão. */
export function StageScene({ scene, drawName, onReelDone }: StageSceneProps) {
  switch (scene.phase) {
    case "ready":
      return (
        <div className={styles.ready}>
          <p className={styles.eyebrow}>Sorteio</p>
          <p className={styles.title}>{drawName}</p>
          {scene.prepared ? <p className={styles.question}>Preparado?</p> : null}
        </div>
      );

    case "reel":
      return (
        <div className={styles.center}>
          <DrawReel
            key={scene.id}
            names={scene.names}
            winners={scene.winners}
            total={scene.total}
            label={scene.label}
            pace={scene.pace}
            size="xl"
            skippable={onReelDone !== undefined}
            onDone={onReelDone ?? ignore}
          />
        </div>
      );

    case "single":
      return (
        <div className={styles.center}>
          <p className={styles.congrats}>{scene.heading}</p>
          <p className={cx(styles.winner, nameSize(scene.name))}>{scene.name}</p>
        </div>
      );

    case "grid":
      return (
        <div className={styles.center}>
          <p className={styles.congrats}>Parabéns!</p>
          <ol
            role="list"
            className={cx(
              styles.grid,
              scene.total <= 3 && styles.few,
              scene.total > 10 && styles.many,
            )}
          >
            {scene.winners.map((winner) => (
              <li key={winner.position} className={styles.cell}>
                <span className={styles.position}>{ordinal(winner.position)}</span>
                <span className={styles.cellName}>{winner.name}</span>
              </li>
            ))}
          </ol>
          {scene.total > GRID_LIMIT ? (
            <p className={styles.more}>e mais {scene.total - GRID_LIMIT} vencedores</p>
          ) : null}
        </div>
      );
  }
}

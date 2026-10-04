import { Button } from "~/components/Button";
import { drawBlocker, sessionStats } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { formatNumber } from "~/utils/format";
import styles from "./MobileDrawBar.module.css";
import { useDrawRound } from "./useDrawRound";

/** Atalho fixo no rodapé em telas estreitas, onde o painel de configuração fica abaixo da lista. */
export function MobileDrawBar() {
  const { state } = useSession();
  const draw = useDrawRound();
  const stats = sessionStats(state);
  if (stats.total === 0) return null;
  const blocker = drawBlocker(state);
  const { quantity } = state.settings;

  return (
    <div className={styles.bar} role="region" aria-label="Sortear rapidamente">
      <p className={styles.summary}>
        <strong className="numeric">{formatNumber(stats.available)}</strong>{" "}
        {stats.available === 1 ? "disponível" : "disponíveis"}
      </p>
      <Button
        variant="primary"
        icon="shuffle"
        disabled={blocker !== null}
        onClick={() => {
          draw.start();
        }}
      >
        {blocker ? "Sortear" : `Sortear ${formatNumber(quantity)}`}
      </Button>
    </div>
  );
}

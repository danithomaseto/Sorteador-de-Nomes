import { Link } from "react-router";
import { Icon } from "~/components/Icon";
import { useSession } from "~/features/session/SessionProvider";
import { countLabel, formatTime } from "~/lib/format";
import { ExportMenu } from "./ExportMenu";
import styles from "./HistoryPanel.module.css";

const PREVIEW_NAMES = 3;

/** Rodadas desta sessão, da mais recente para a mais antiga. Nenhuma pode ser refeita. */
export function HistoryPanel() {
  const { state } = useSession();
  const rounds = [...state.rounds].reverse();

  return (
    <section aria-labelledby="historico-titulo" className={styles.panel}>
      <div className={styles.header}>
        <h2 id="historico-titulo">Histórico</h2>
        {rounds.length > 0 ? (
          <ExportMenu rounds={state.rounds} label="Exportar tudo" size="sm" />
        ) : null}
      </div>
      {rounds.length === 0 ? (
        <p className={styles.empty}>
          As rodadas aparecem aqui. Cada uma fica registrada nesta sessão e não pode ser refeita.
        </p>
      ) : (
        <ol role="list" className={styles.list}>
          {rounds.map((round) => {
            const names = round.winners.slice(0, PREVIEW_NAMES).map((w) => w.name);
            const more = round.winners.length - names.length;
            return (
              <li key={round.number}>
                <Link to={`/sorteio/rodadas/${String(round.number)}`} className={styles.item}>
                  <span className={styles.title}>
                    Rodada {round.number}
                    <span className={styles.meta}>
                      {countLabel(round.winners.length, "vencedor", "vencedores")} ·{" "}
                      {formatTime(round.drawnAt)}
                    </span>
                  </span>
                  <span className={styles.names}>
                    {names.join(", ")}
                    {more > 0 ? ` e mais ${String(more)}` : ""}
                  </span>
                  <Icon name="chevron-right" className={styles.chevron} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/Button";
import { ConfirmDialog } from "~/components/Dialog";
import { Icon } from "~/components/Icon";
import { useToast } from "~/components/Toast";
import { useSession } from "~/features/session/SessionProvider";
import { countLabel, formatTime } from "~/utils/format";
import { ExportMenu } from "./ExportMenu";
import styles from "./HistoryPanel.module.css";

const PREVIEW_NAMES = 3;

interface HistoryPanelProps {
  /** Título só para leitores de tela (no celular, a aba já diz qual é a seção). */
  hideTitle?: boolean;
}

/** Rodadas desta sessão, da mais recente para a mais antiga. Nenhuma pode ser refeita. */
export function HistoryPanel({ hideTitle = false }: HistoryPanelProps) {
  const { state, dispatch } = useSession();
  const toast = useToast();
  const [confirmRestart, setConfirmRestart] = useState(false);
  const rounds = [...state.rounds].reverse();

  return (
    <section aria-labelledby="historico-titulo" className={styles.panel}>
      <div className={styles.header}>
        <h2 id="historico-titulo" className={hideTitle ? "visually-hidden" : styles.heading}>
          Histórico
        </h2>
        {rounds.length > 0 ? (
          <ExportMenu rounds={state.rounds} label="Exportar tudo" size="sm" align="end" />
        ) : null}
      </div>
      {rounds.length === 0 ? (
        <p className={styles.empty}>
          Nenhuma rodada ainda. Cada sorteio fica registrado aqui, nesta sessão, e não pode ser
          refeito.
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
      {rounds.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          icon="restore"
          className={styles.restart}
          onClick={() => {
            setConfirmRestart(true);
          }}
        >
          Reiniciar sorteio
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirmRestart}
        title="Reiniciar o sorteio?"
        description="Os resultados desta sessão serão apagados e todos os participantes voltam a concorrer. A lista de participantes continua. Se precisar de um registro, exporte antes."
        confirmLabel="Apagar resultados e reiniciar"
        onConfirm={() => {
          dispatch({ type: "restart" });
          setConfirmRestart(false);
          toast({ message: "Resultados apagados. Todos os participantes estão disponíveis." });
        }}
        onCancel={() => {
          setConfirmRestart(false);
        }}
      />
    </section>
  );
}

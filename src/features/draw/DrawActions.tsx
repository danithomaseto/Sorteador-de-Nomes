import { useState } from "react";
import { Link } from "react-router";
import { Button, ButtonLink } from "~/components/Button";
import { ConfirmDialog } from "~/components/Dialog";
import { InlineAlert } from "~/components/InlineAlert";
import { useToast } from "~/components/Toast";
import { useDrawRound } from "~/features/rounds/useDrawRound";
import { blockerMessage, drawBlocker, sessionStats } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { formatNumber } from "~/utils/format";
import styles from "./DrawActions.module.css";
import { NewDrawButton } from "./NewDrawButton";
import { requestFullscreen } from "./requestFullscreen";

const QUANTITY_PROBLEMS = new Set(["invalid_quantity", "exceeds_available", "exceeds_max"]);

interface DrawActionsProps {
  /** No celular, "Sortear" fica na barra fixa do rodapé; aqui só o restante. */
  showDraw?: boolean;
}

/** Disponíveis, avisos e as ações da rodada: sortear e apresentar. */
export function DrawActions({ showDraw = true }: DrawActionsProps) {
  const { state, dispatch } = useSession();
  const toast = useToast();
  const draw = useDrawRound();
  const [confirmRestore, setConfirmRestore] = useState(false);

  const stats = sessionStats(state);
  const blocker = drawBlocker(state);
  const allUsed = blocker?.code === "all_used";
  // Problemas de quantidade aparecem junto do campo, nas regras.
  const showBlocker = blocker && !allUsed && !QUANTITY_PROBLEMS.has(blocker.code);
  const { quantity } = state.settings;
  const validQuantity = Number.isInteger(quantity) && quantity > 0;

  return (
    <div className={styles.actions}>
      {showDraw ? (
        <p className={styles.summary}>
          <span>
            <strong className="numeric">{formatNumber(stats.available)}</strong>{" "}
            {stats.available === 1 ? "disponível" : "disponíveis"}
            {stats.removed > 0 ? (
              <span className={styles.muted}> · {formatNumber(stats.removed)} já sorteados</span>
            ) : null}
          </span>
          <Link to="/como-funciona" className={styles.how}>
            Como funciona?
          </Link>
        </p>
      ) : null}

      {allUsed ? (
        <InlineAlert
          tone="info"
          title="Todos os participantes já foram sorteados"
          actions={
            <>
              <Button
                size="sm"
                icon="restore"
                onClick={() => {
                  setConfirmRestore(true);
                }}
              >
                Restaurar participantes
              </Button>
              <NewDrawButton />
            </>
          }
        >
          Restaure a lista para sortear de novo entre todos, ou comece um novo sorteio.
        </InlineAlert>
      ) : null}

      {showBlocker ? <p className={styles.blocker}>{blockerMessage(blocker)}</p> : null}

      {showDraw ? (
        <Button
          variant="primary"
          size="lg"
          icon="shuffle"
          fullWidth
          disabled={blocker !== null}
          onClick={() => {
            draw.start();
          }}
        >
          {validQuantity ? `Sortear ${formatNumber(quantity)}` : "Sortear"}
        </Button>
      ) : null}
      <ButtonLink to="/sorteio/apresentacao" icon="monitor" fullWidth onClick={requestFullscreen}>
        Apresentar em tela cheia
      </ButtonLink>
      {showDraw ? null : (
        <p className={styles.help}>
          <Link to="/como-funciona">Como o sorteio funciona?</Link>
        </p>
      )}

      <ConfirmDialog
        open={confirmRestore}
        tone="primary"
        title="Restaurar todos os participantes?"
        description="Quem já foi sorteado volta a participar das próximas rodadas. O histórico continua registrado."
        confirmLabel="Restaurar"
        onConfirm={() => {
          dispatch({ type: "restoreParticipants" });
          setConfirmRestore(false);
          toast({ tone: "success", message: "Todos os participantes estão disponíveis de novo." });
        }}
        onCancel={() => {
          setConfirmRestore(false);
        }}
      />
    </div>
  );
}

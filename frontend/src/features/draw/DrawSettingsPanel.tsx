import { useState } from "react";
import { Link } from "react-router";
import { Button, ButtonLink } from "~/components/Button";
import { ConfirmDialog } from "~/components/Dialog";
import { InlineAlert } from "~/components/InlineAlert";
import { SegmentedControl } from "~/components/SegmentedControl";
import { Switch } from "~/components/Switch";
import { useToast } from "~/components/Toast";
import { useDrawRound } from "~/features/rounds/useDrawRound";
import type { DrawSettings, RevealMode } from "~/features/session/model";
import { blockerMessage, drawBlocker, sessionStats } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { errorMessage } from "~/lib/api/messages";
import { formatNumber } from "~/lib/format";
import { useLimits } from "~/lib/useLimits";
import styles from "./DrawSettingsPanel.module.css";
import { NewDrawButton } from "./NewDrawButton";
import { QuantityPicker } from "./QuantityPicker";
import { requestFullscreen } from "./requestFullscreen";

const QUANTITY_PROBLEMS = new Set(["invalid_quantity", "exceeds_available", "exceeds_max"]);

export function DrawSettingsPanel() {
  const { state, dispatch } = useSession();
  const limits = useLimits();
  const toast = useToast();
  const draw = useDrawRound();
  const [confirmRestore, setConfirmRestore] = useState(false);

  const stats = sessionStats(state);
  const blocker = drawBlocker(state, limits);
  const allUsed = blocker?.code === "all_used";
  const quantityError =
    blocker && QUANTITY_PROBLEMS.has(blocker.code) ? blockerMessage(blocker) : undefined;
  const { quantity, allowRepeat, removeWinners, revealMode } = state.settings;

  function update(changes: Partial<DrawSettings>) {
    draw.resetError();
    dispatch({ type: "updateSettings", changes });
  }

  return (
    <section aria-labelledby="configuracao-titulo" className={styles.panel}>
      <h2 id="configuracao-titulo">Configuração</h2>

      <QuantityPicker
        value={quantity}
        max={limits.max_round_quantity}
        error={quantityError}
        disabled={draw.pending}
        onChange={(next) => {
          update({ quantity: next });
        }}
      />

      <div className={styles.switches}>
        <Switch
          label="Remover vencedores das próximas rodadas"
          description="Quem ganhar não participa das rodadas seguintes deste sorteio."
          checked={removeWinners}
          disabled={draw.pending}
          onChange={(checked) => {
            update({ removeWinners: checked });
          }}
        />
        <Switch
          label="Permitir repetir na mesma rodada"
          description="A mesma pessoa pode sair mais de uma vez no mesmo resultado."
          checked={allowRepeat}
          disabled={draw.pending}
          onChange={(checked) => {
            update({ allowRepeat: checked });
          }}
        />
      </div>

      <SegmentedControl<RevealMode>
        legend="Exibição do resultado"
        value={revealMode}
        options={[
          { value: "compact", label: "Lista" },
          { value: "sequential", label: "Um a um" },
        ]}
        onChange={(mode) => {
          update({ revealMode: mode });
        }}
      />

      <p className={styles.summary}>
        <strong className="numeric">{formatNumber(stats.available)}</strong>{" "}
        {stats.available === 1 ? "disponível" : "disponíveis"}
        {stats.removed > 0 ? (
          <span className={styles.muted}> · {formatNumber(stats.removed)} já sorteados</span>
        ) : null}
      </p>

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

      {blocker && !quantityError && !allUsed ? (
        <p className={styles.blocker}>{blockerMessage(blocker)}</p>
      ) : null}

      {draw.error ? (
        <InlineAlert tone="error" title="Não foi possível sortear" live>
          {errorMessage(draw.error)} Nenhum resultado foi registrado.
        </InlineAlert>
      ) : null}

      <div className={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          icon="shuffle"
          fullWidth
          loading={draw.pending}
          disabled={blocker !== null}
          onClick={() => {
            void draw.start();
          }}
        >
          {draw.pending
            ? "Sorteando…"
            : Number.isInteger(quantity) && quantity > 0
              ? `Sortear ${formatNumber(quantity)}`
              : "Sortear"}
        </Button>
        <ButtonLink to="/sorteio/apresentacao" icon="monitor" fullWidth onClick={requestFullscreen}>
          Apresentar em tela cheia
        </ButtonLink>
        <Link to="/como-funciona" className={styles.how}>
          Como o sorteio funciona?
        </Link>
      </div>

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
    </section>
  );
}

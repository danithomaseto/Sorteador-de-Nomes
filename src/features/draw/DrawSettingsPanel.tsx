import { SegmentedControl } from "~/components/SegmentedControl";
import { Switch } from "~/components/Switch";
import type { DrawSettings, RevealMode } from "~/features/session/model";
import { blockerMessage, drawBlocker } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { LIMITS } from "~/config";
import styles from "./DrawSettingsPanel.module.css";
import { QuantityPicker } from "./QuantityPicker";

const QUANTITY_PROBLEMS = new Set(["invalid_quantity", "exceeds_available", "exceeds_max"]);

interface DrawSettingsPanelProps {
  /** Título só para leitores de tela (no celular, a aba já diz qual é a seção). */
  hideTitle?: boolean;
}

/** Regras da próxima rodada. As ações (sortear, apresentar) ficam em `DrawActions`. */
export function DrawSettingsPanel({ hideTitle = false }: DrawSettingsPanelProps) {
  const { state, dispatch } = useSession();
  const blocker = drawBlocker(state);
  const quantityError =
    blocker && QUANTITY_PROBLEMS.has(blocker.code) ? blockerMessage(blocker) : undefined;
  const { quantity, allowRepeat, removeWinners, revealMode } = state.settings;

  function update(changes: Partial<DrawSettings>) {
    dispatch({ type: "updateSettings", changes });
  }

  return (
    <section aria-labelledby="regras-titulo" className={styles.panel}>
      <h2 id="regras-titulo" className={hideTitle ? "visually-hidden" : styles.title}>
        Regras do sorteio
      </h2>

      <QuantityPicker
        value={quantity}
        max={LIMITS.maxRoundQuantity}
        error={quantityError}
        onChange={(next) => {
          update({ quantity: next });
        }}
      />

      <div className={styles.switches}>
        <Switch
          label="Remover vencedores das próximas rodadas"
          description="Quem ganhar não participa das rodadas seguintes."
          checked={removeWinners}
          onChange={(checked) => {
            update({ removeWinners: checked });
          }}
        />
        <Switch
          label="Permitir repetir na mesma rodada"
          description="A mesma pessoa pode sair mais de uma vez no resultado."
          checked={allowRepeat}
          onChange={(checked) => {
            update({ allowRepeat: checked });
          }}
        />
      </div>

      <SegmentedControl<RevealMode>
        legend="Exibição do resultado"
        value={revealMode}
        options={[
          { value: "compact", label: "Todos juntos" },
          { value: "sequential", label: "Um a um" },
        ]}
        onChange={(mode) => {
          update({ revealMode: mode });
        }}
      />
    </section>
  );
}

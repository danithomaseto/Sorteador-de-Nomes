import { useEffect, useRef, useState } from "react";
import { TextField } from "~/components/Field";
import { SegmentedControl } from "~/components/SegmentedControl";
import { QUANTITY_PRESETS } from "~/features/session/model";
import styles from "./QuantityPicker.module.css";

type Choice = (typeof QUANTITY_PRESETS)[number] | "custom";

interface QuantityPickerProps {
  value: number;
  max: number;
  error?: string;
  disabled?: boolean;
  onChange: (quantity: number) => void;
}

function isPreset(value: number): value is (typeof QUANTITY_PRESETS)[number] {
  return (QUANTITY_PRESETS as readonly number[]).includes(value);
}

/** Atalhos 1/3/5/10/20 e um campo para outros valores. Valores inválidos viram NaN (bloqueiam o sorteio). */
export function QuantityPicker({ value, max, error, disabled, onChange }: QuantityPickerProps) {
  const [custom, setCustom] = useState(!isPreset(value));
  const [draft, setDraft] = useState(Number.isFinite(value) ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const focusCustom = useRef(false);

  useEffect(() => {
    if (custom && focusCustom.current) {
      focusCustom.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [custom]);

  const choice: Choice = custom ? "custom" : isPreset(value) ? value : "custom";

  return (
    <div className={styles.picker}>
      <SegmentedControl<Choice>
        legend="Quantidade de vencedores"
        value={choice}
        options={[
          ...QUANTITY_PRESETS.map((preset) => ({ value: preset, label: String(preset) })),
          { value: "custom" as const, label: "Outro" },
        ]}
        onChange={(next) => {
          if (next === "custom") {
            focusCustom.current = true;
            setCustom(true);
            setDraft(Number.isFinite(value) ? String(value) : "");
            return;
          }
          setCustom(false);
          setDraft(String(next));
          onChange(next);
        }}
      />
      {custom ? (
        <TextField
          ref={inputRef}
          label="Quantidade personalizada"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          step={1}
          value={draft}
          disabled={disabled}
          error={error}
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            onChange(/^\d+$/.test(text) ? Number(text) : Number.NaN);
          }}
        />
      ) : error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

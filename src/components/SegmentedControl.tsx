import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import styles from "./SegmentedControl.module.css";

interface Option<T extends string | number> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string | number> {
  legend: ReactNode;
  value: T | null;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  hideLegend?: boolean;
  className?: string;
}

/** Grupo de rádio nativo (setas do teclado funcionam) com aparência de botões segmentados. */
export function SegmentedControl<T extends string | number>({
  legend,
  value,
  options,
  onChange,
  hideLegend,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className={cx(styles.root, className)}>
      <legend className={cx(styles.legend, hideLegend && "visually-hidden")}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={String(option.value)} className={styles.option}>
            <input
              type="radio"
              name={name}
              className={styles.input}
              checked={option.value === value}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span className={styles.segment}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

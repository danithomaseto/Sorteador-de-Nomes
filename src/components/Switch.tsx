import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";
import styles from "./Switch.module.css";

interface SwitchProps {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Interruptor acessível: `input type="checkbox" role="switch"`, anunciado como ligado/desligado. */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  className,
}: SwitchProps) {
  const id = useId();
  const descriptionId = `${id}-descricao`;
  return (
    <div className={cx(styles.root, className)}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <label htmlFor={id} className={styles.label}>
        <span className={styles.track} aria-hidden="true">
          <span className={styles.thumb}>{checked ? <Icon name="check" size={12} /> : null}</span>
        </span>
        <span className={styles.text}>{label}</span>
      </label>
      {description ? (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

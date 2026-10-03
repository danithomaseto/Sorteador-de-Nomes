import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";
import styles from "./Field.module.css";
import { Icon } from "./Icon";

interface FieldFrameProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  hideLabel?: boolean;
  className?: string;
}

interface FrameIds {
  id: string;
  describedBy: string | undefined;
  invalid: true | undefined;
}

function useFieldIds(
  id: string | undefined,
  hint: ReactNode,
  error: ReactNode,
): FrameIds & { hintId: string; errorId: string } {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = `${fieldId}-ajuda`;
  const errorId = `${fieldId}-erro`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return { id: fieldId, hintId, errorId, describedBy, invalid: error ? true : undefined };
}

function Frame({
  label,
  hint,
  error,
  hideLabel,
  className,
  ids,
  children,
}: FieldFrameProps & { ids: ReturnType<typeof useFieldIds>; children: ReactNode }) {
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={ids.id} className={cx(styles.label, hideLabel && "visually-hidden")}>
        {label}
      </label>
      {children}
      {hint ? (
        <p id={ids.hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={ids.errorId} className={styles.error}>
          <Icon name="alert-circle" size={16} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = FieldFrameProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    inputClassName?: string;
    ref?: Ref<HTMLInputElement>;
  };

export function TextField({
  label,
  hint,
  error,
  hideLabel,
  className,
  inputClassName,
  id,
  ...props
}: TextFieldProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Frame
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
      ids={ids}
    >
      <input
        id={ids.id}
        className={cx(styles.control, error ? styles.invalid : null, inputClassName)}
        aria-invalid={ids.invalid}
        aria-describedby={ids.describedBy}
        {...props}
      />
    </Frame>
  );
}

type TextAreaProps = FieldFrameProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
    ref?: Ref<HTMLTextAreaElement>;
  };

export function TextArea({
  label,
  hint,
  error,
  hideLabel,
  className,
  id,
  ...props
}: TextAreaProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Frame
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
      ids={ids}
    >
      <textarea
        id={ids.id}
        className={cx(styles.control, styles.textarea, error ? styles.invalid : null)}
        aria-invalid={ids.invalid}
        aria-describedby={ids.describedBy}
        {...props}
      />
    </Frame>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

type SelectFieldProps = FieldFrameProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & { options: readonly SelectOption[] };

export function SelectField({
  label,
  hint,
  error,
  hideLabel,
  className,
  id,
  options,
  ...props
}: SelectFieldProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Frame
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
      ids={ids}
    >
      <div className={styles.selectWrap}>
        <select
          id={ids.id}
          className={cx(styles.control, styles.select, error ? styles.invalid : null)}
          aria-invalid={ids.invalid}
          aria-describedby={ids.describedBy}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={18} className={styles.selectIcon} />
      </div>
    </Frame>
  );
}

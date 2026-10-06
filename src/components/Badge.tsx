import type { ReactNode } from "react";
import styles from "./Badge.module.css";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

type Tone = "neutral" | "success" | "warning" | "highlight";

export function Badge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span className={cx(styles.badge, styles[tone])}>
      {icon ? <Icon name={icon} size={14} /> : null}
      <span className={styles.text}>{children}</span>
    </span>
  );
}

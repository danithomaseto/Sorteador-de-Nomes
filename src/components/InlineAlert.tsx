import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import styles from "./InlineAlert.module.css";

type Tone = "info" | "success" | "warning" | "error";

const ICONS: Record<Tone, IconName> = {
  info: "info",
  success: "check-circle",
  warning: "alert",
  error: "alert-circle",
};

interface InlineAlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Erros que surgem após uma ação do usuário devem ser anunciados imediatamente. */
  live?: boolean;
}

export function InlineAlert({
  tone = "info",
  title,
  children,
  actions,
  className,
  live = false,
}: InlineAlertProps) {
  const role = live ? (tone === "error" ? "alert" : "status") : undefined;
  return (
    <div className={cx(styles.alert, styles[tone], className)} role={role}>
      <Icon name={ICONS[tone]} className={styles.icon} />
      <div className={styles.content}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.body}>{children}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";
import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
}

export function EmptyState({ icon, title, children, actions, headingLevel = 3 }: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={styles.empty}>
      {icon ? (
        <span className={styles.icon}>
          <Icon name={icon} size={24} />
        </span>
      ) : null}
      <Heading className={styles.title}>{title}</Heading>
      {children ? <div className={styles.text}>{children}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

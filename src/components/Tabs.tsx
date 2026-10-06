import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";
import styles from "./Tabs.module.css";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** Número ao lado do rótulo (ex.: quantos participantes). */
  count?: ReactNode;
}

interface TabsProps<T extends string> {
  /** Identificador comum às abas e aos painéis (`useId()` no componente pai). */
  id: string;
  label: string;
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Abas acessíveis (padrão WAI-ARIA): setas, Home e End trocam de aba; só a aba ativa entra na
 * ordem do Tab. Cada painel usa `tabPanelProps` para se ligar à sua aba.
 */
export function Tabs<T extends string>({
  id: baseId,
  label,
  tabs,
  value,
  onChange,
  className,
}: TabsProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((tab) => tab.value === value);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const tab = tabs[next];
    if (!tab) return;
    onChange(tab.value);
    refs.current.get(tab.value)?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className={cx(styles.list, className)}>
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(element) => {
              if (element) refs.current.set(tab.value, element);
              else refs.current.delete(tab.value);
            }}
            type="button"
            role="tab"
            id={tabId(baseId, tab.value)}
            aria-selected={selected}
            aria-controls={panelId(baseId, tab.value)}
            tabIndex={selected ? 0 : -1}
            className={styles.tab}
            onKeyDown={onKeyDown}
            onClick={() => {
              onChange(tab.value);
            }}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <>
                {" "}
                <span className={cx(styles.count, "numeric")}>{tab.count}</span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function tabId(baseId: string, value: string) {
  return `${baseId}-aba-${value}`;
}

function panelId(baseId: string, value: string) {
  return `${baseId}-painel-${value}`;
}

/** Liga um painel à sua aba (mesmo `id` passado a `Tabs`). */
export function tabPanelProps(baseId: string, value: string) {
  return {
    role: "tabpanel",
    id: panelId(baseId, value),
    "aria-labelledby": tabId(baseId, value),
    tabIndex: -1,
  } as const;
}

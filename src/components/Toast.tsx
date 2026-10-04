import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";
import styles from "./Toast.module.css";

type Tone = "neutral" | "success" | "error";

interface ToastOptions {
  message: string;
  tone?: Tone;
  action?: { label: string; onAction: () => void };
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => undefined);

const DURATION_MS = 6000;
const DURATION_WITH_ACTION_MS = 9000;

/** Notificações curtas, anunciadas por leitores de tela (região ao vivo educada). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setItems((current) => [...current.slice(-2), { ...options, id }]);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} aria-live="polite" aria-relevant="additions" data-print="hide">
        {items.map((item) => (
          <ToastMessage key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        onDismiss(item.id);
      },
      item.action ? DURATION_WITH_ACTION_MS : DURATION_MS,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [item, onDismiss]);

  const tone = item.tone ?? "neutral";
  return (
    <div className={cx(styles.toast, styles[tone])}>
      {tone === "success" ? <Icon name="check-circle" /> : null}
      {tone === "error" ? <Icon name="alert-circle" /> : null}
      <p className={styles.message}>{item.message}</p>
      {item.action ? (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            item.action?.onAction();
            onDismiss(item.id);
          }}
        >
          {item.action.label}
        </button>
      ) : null}
      <button
        type="button"
        className={styles.close}
        aria-label="Fechar notificação"
        onClick={() => {
          onDismiss(item.id);
        }}
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Enquanto o modo apresentação está aberto: tema forçado (o anterior é restaurado ao sair) e
 * marcação `data-presenting`, que esconde notificações que a plateia não precisa ver.
 */
export function usePresentationDocument(theme: "dark" | "light") {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = theme;
    root.dataset.presenting = "true";
    return () => {
      delete root.dataset.presenting;
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    };
  }, [theme]);
}

/** Mantém a tela acesa durante o evento (Screen Wake Lock), quando o navegador permite. */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        sentinel = null; // negado (ex.: bateria fraca): a apresentação segue normalmente
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !disposed) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, []);
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
  };
}

export function useFullscreen() {
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
  const [supported] = useState(
    () =>
      typeof document !== "undefined" &&
      typeof document.documentElement.requestFullscreen === "function",
  );

  // Ao sair do modo apresentação, sai também da tela cheia.
  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    },
    [],
  );

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);

  return { active, supported, toggle };
}

/** Verdadeiro após um tempo sem mexer o mouse ou o teclado (para esconder os controles). */
export function useIdle(timeoutMs: number): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = window.setTimeout(() => {
      setIdle(true);
    }, timeoutMs);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setIdle(true);
      }, timeoutMs);
    };
    const events = ["mousemove", "pointerdown", "keydown", "focusin", "touchstart"] as const;
    events.forEach((name) => {
      window.addEventListener(name, wake, { passive: true });
    });
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => {
        window.removeEventListener(name, wake);
      });
    };
  }, [timeoutMs]);
  return idle;
}

/** Espaço/Enter acionam a ação principal quando o foco não está em outro controle. */
export function usePrimaryKey(action: (() => void) | null) {
  useEffect(() => {
    if (!action) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea, [role='switch'], dialog")) return;
      event.preventDefault();
      action();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [action]);
}

interface StageShortcuts {
  onFullscreen: () => void;
  onExit: () => void;
  fullscreenActive: boolean;
}

/** F alterna a tela cheia; Esc sai da apresentação (em tela cheia, o navegador usa o Esc para sair dela). */
export function useStageShortcuts({ onFullscreen, onExit, fullscreenActive }: StageShortcuts) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea")) return;
      if (event.key === "f" || event.key === "F") onFullscreen();
      else if (event.key === "Escape" && !fullscreenActive) onExit();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [fullscreenActive, onExit, onFullscreen]);
}

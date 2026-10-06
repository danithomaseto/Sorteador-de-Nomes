import { useCallback, useSyncExternalStore } from "react";

/** Acompanha uma media query (ex.: a largura em que a área do sorteio vira colunas). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** A partir desta largura, a área do sorteio mostra lista e regras lado a lado. */
export const WIDE_WORKSPACE = "(min-width: 1024px)";

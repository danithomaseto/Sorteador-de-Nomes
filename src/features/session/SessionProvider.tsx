import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { formatDate } from "~/utils/format";
import type { SessionState } from "./model";
import { hasSessionData } from "./selectors";
import { createSession, sessionReducer, type SessionAction } from "./sessionReducer";

interface SessionContextValue {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function defaultDrawName(date = new Date()): string {
  return `Sorteio de ${formatDate(date)}`;
}

/** Guarda a sessão em memória, acima das rotas: navegar mantém os dados, recarregar descarta. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, undefined, () =>
    createSession(defaultDrawName()),
  );
  useLeaveWarning(hasSessionData(state));
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession precisa estar dentro de SessionProvider.");
  return context;
}

/** Sem armazenamento, sair da página perde a lista: o navegador pede confirmação antes. */
function useLeaveWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [enabled]);
}

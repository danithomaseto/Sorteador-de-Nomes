import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Politeness = "polite" | "assertive";
type Announce = (message: string, politeness?: Politeness) => void;

const AnnouncerContext = createContext<Announce>(() => undefined);

/**
 * Regiões "ao vivo" para leitores de tela: anunciam mudanças que não movem o foco
 * (participante adicionado, resultado do sorteio, erros).
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Record<Politeness, string>>({
    polite: "",
    assertive: "",
  });

  const announce = useCallback<Announce>((message, politeness = "polite") => {
    // Limpa e repõe para que a mesma frase seja anunciada de novo.
    setMessages((current) => ({ ...current, [politeness]: "" }));
    window.setTimeout(() => {
      setMessages((current) => ({ ...current, [politeness]: message }));
    }, 60);
  }, []);

  const value = useMemo(() => announce, [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {messages.polite}
      </div>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">
        {messages.assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce(): Announce {
  return useContext(AnnouncerContext);
}

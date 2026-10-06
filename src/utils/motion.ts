/**
 * Movimento nas páginas de apresentação. Regras:
 * - o HTML pré-renderizado já mostra o estado final (sem JavaScript, nada fica escondido);
 * - nada se move com "reduzir movimento" ativado no sistema;
 * - animações em laço param fora da tela e com a aba em segundo plano;
 * - estilos dinâmicos só pelo CSSOM, nunca como atributo (a CSP não permite estilo embutido).
 */
import { useEffect, useState, type RefObject } from "react";

// Duração da entrada mais o maior atraso em sequência (ver global.css).
const REVEAL_CLEANUP_MS = 1200;

export function prefersReducedMotion(): boolean {
  return (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Verdadeiro enquanto o elemento está visível na tela (ou só a primeira vez, com `once`). */
export function useInView(
  ref: RefObject<Element | null>,
  { once = false, rootMargin = "0px", threshold = 0.25 } = {},
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [once, ref, rootMargin, threshold]);
  return inView;
}

/** Verdadeiro enquanto a aba está visível (animações em laço param em segundo plano). */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => {
      setVisible(document.visibilityState === "visible");
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return visible;
}

/**
 * Entrada suave dos blocos marcados com `data-reveal` ao rolar a página. Só os que começam abaixo
 * da dobra ficam pendentes: o que já está na tela nunca pisca. `data-reveal="stagger"` faz os
 * filhos entrarem em sequência (atrasos no CSS global).
 */
export function useRevealOnScroll(
  container: RefObject<HTMLElement | null>,
  selector = "[data-reveal]",
): void {
  useEffect(() => {
    const root = container.current;
    if (!root || prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const pending = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => element.getBoundingClientRect().top > window.innerHeight * 0.92,
    );
    if (pending.length === 0) return undefined;
    for (const element of pending) element.classList.add("reveal-pending");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target;
          element.classList.add("reveal-in");
          element.classList.remove("reveal-pending");
          observer.unobserve(element);
          // Terminada a entrada, o elemento volta às próprias transições (ex.: hover).
          window.setTimeout(() => {
            element.classList.remove("reveal-in");
          }, REVEAL_CLEANUP_MS);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    for (const element of pending) observer.observe(element);
    return () => {
      observer.disconnect();
      for (const element of pending) element.classList.remove("reveal-pending");
    };
  }, [container, selector]);
}

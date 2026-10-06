import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { prefersReducedMotion, useRevealOnScroll } from "~/utils/motion";
import { cx } from "../cx";
import styles from "./DocLayout.module.css";
import { PageLayout } from "./PageLayout";

export interface DocSection {
  id: string;
  title: string;
}

interface DocLayoutProps {
  title: string;
  lead: ReactNode;
  /** Seções da página, na ordem, para o sumário lateral. */
  sections: readonly DocSection[];
  /** Ficha "Em resumo" (coluna direita no desktop; antes do texto no celular). */
  summary: ReactNode;
  children: ReactNode;
}

/**
 * Páginas de texto (como funciona, privacidade): sumário à esquerda, texto na largura de leitura
 * ao centro e uma ficha-resumo à direita. Em telas menores, as colunas laterais saem do caminho.
 */
export function DocLayout({ title, lead, sections, summary, children }: DocLayoutProps) {
  const [current, setCurrent] = useCurrentSection(sections);
  const contentRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  useRevealOnScroll(contentRef, ":scope > section");
  useRevealOnScroll(summaryRef, "dl");

  // Indicador da seção atual: desliza até o item do sumário (posição aplicada pelo CSSOM).
  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    const link = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!indicator || !link) return;
    indicator.style.transform = `translateY(${String(link.offsetTop)}px)`;
    indicator.style.height = `${String(link.offsetHeight)}px`;
    if (styles.ready) indicator.classList.add(styles.ready);
  }, [current]);

  function goTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    setCurrent(id);
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    window.history.replaceState(window.history.state, "", `#${id}`);
    // O foco acompanha a rolagem (teclado e leitores de tela continuam dali).
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }

  return (
    <PageLayout>
      <div className={cx("container", styles.page)}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
        </header>

        <nav className={styles.toc} aria-label="Nesta página">
          <p className={cx("eyebrow", styles.tocTitle)}>Nesta página</p>
          <div ref={listRef} className={styles.tocList}>
            <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
            <ul role="list">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={styles.tocLink}
                    aria-current={current === section.id ? "location" : undefined}
                    onClick={(event) => {
                      goTo(event, section.id);
                    }}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <aside ref={summaryRef} className={styles.summary} aria-label="Em resumo">
          <p className={cx("eyebrow", styles.summaryTitle)}>Em resumo</p>
          {summary}
        </aside>

        <article ref={contentRef} className={styles.content}>
          {children}
        </article>
      </div>
    </PageLayout>
  );
}

/**
 * Seção atual, para destacar no sumário: a última cujo título já passou da linha de leitura (30%
 * da altura da tela). No fim da página vale a última seção — as finais nunca chegam ao topo. Ao
 * clicar no sumário, o item escolhido fica marcado até a pessoa rolar a página de novo.
 */
function useCurrentSection(sections: readonly DocSection[]) {
  const [current, setCurrent] = useState<string | null>(sections[0]?.id ?? null);
  const chosen = useRef<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const compute = () => {
      frame = 0;
      if (chosen.current) {
        setCurrent(chosen.current);
        return;
      }
      const scroller = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= scroller.scrollHeight - 4;
      let active = sections[0]?.id ?? null;
      if (atBottom && window.scrollY > 0) {
        active = sections.at(-1)?.id ?? active;
      } else {
        const line = window.innerHeight * 0.3;
        for (const section of sections) {
          const element = document.getElementById(section.id);
          if (element && element.getBoundingClientRect().top <= line) active = section.id;
        }
      }
      setCurrent(active);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(compute);
    };
    // Rolagem feita pela pessoa (roda do mouse, toque, teclado) libera a escolha do sumário.
    const release = () => {
      chosen.current = null;
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    for (const name of ["wheel", "touchstart", "keydown"] as const) {
      window.addEventListener(name, release, { passive: true });
    }
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      for (const name of ["wheel", "touchstart", "keydown"] as const) {
        window.removeEventListener(name, release);
      }
    };
  }, [sections]);

  const choose = useCallback((id: string) => {
    chosen.current = id;
    setCurrent(id);
  }, []);

  return [current, choose] as const;
}

/** Ficha de fatos curtos (termo → descrição), usada no "Em resumo". */
export function FactList({ facts }: { facts: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className={styles.facts}>
      {facts.map(([term, description]) => (
        <div key={term} className={styles.fact}>
          <dt>{term}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}

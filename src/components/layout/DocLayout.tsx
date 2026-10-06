import { useEffect, useState, type ReactNode } from "react";
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
  const current = useCurrentSection(sections);
  return (
    <PageLayout>
      <div className={cx("container", styles.page)}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>{lead}</p>
        </header>

        <nav className={styles.toc} aria-label="Nesta página">
          <p className={cx("eyebrow", styles.tocTitle)}>Nesta página</p>
          <ul role="list">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={styles.tocLink}
                  aria-current={current === section.id ? "location" : undefined}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <aside className={styles.summary} aria-label="Em resumo">
          <p className={cx("eyebrow", styles.summaryTitle)}>Em resumo</p>
          {summary}
        </aside>

        <article className={styles.content}>{children}</article>
      </div>
    </PageLayout>
  );
}

/** Seção visível no momento, para destacar no sumário. */
function useCurrentSection(sections: readonly DocSection[]): string | null {
  const [current, setCurrent] = useState<string | null>(sections[0]?.id ?? null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = sections.find((section) => visible.get(section.id));
        if (first) setCurrent(first.id);
      },
      // Conta como "atual" a seção no terço de cima da tela.
      { rootMargin: "0px 0px -66% 0px" },
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [sections]);
  return current;
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

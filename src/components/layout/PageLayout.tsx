import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { APP_NAME, PRIVACY_MESSAGE } from "~/config";
import { cx } from "../cx";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import styles from "./PageLayout.module.css";

interface PageLayoutProps {
  /**
   * "page": páginas de conteúdo (largura de leitura). "wide": telas de trabalho, com mais largura.
   * "app": área do sorteio — no desktop ocupa exatamente a altura da tela e cada painel rola por
   * conta própria (sem rolagem dupla); no celular, segue o fluxo normal da página.
   */
  layout?: "page" | "wide" | "app";
  children: ReactNode;
}

export function PageLayout({ children, layout = "page" }: PageLayoutProps) {
  const container = layout === "page" ? "container" : "app-container";
  return (
    <div className={cx(styles.page, layout === "app" && styles.app)}>
      <a href="#conteudo" className="skip-link" data-print="hide">
        Pular para o conteúdo
      </a>
      <SiteHeader container={container} />
      <main id="conteudo" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <SiteFooter container={container} />
    </div>
  );
}

function SiteHeader({ container }: { container: string }) {
  return (
    <header className={styles.header} data-print="hide">
      <div className={cx(container, styles.headerInner)}>
        <Link
          to="/"
          className={styles.brand}
          aria-label={`${APP_NAME}, página inicial`}
          viewTransition
        >
          <Logo />
        </Link>
        <nav aria-label="Principal">
          <ul role="list" className={styles.nav}>
            <li className={styles.navSecondary}>
              <NavLink
                to="/sorteio"
                viewTransition
                className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}
              >
                Sorteio
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/como-funciona"
                viewTransition
                className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}
              >
                Como funciona
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({ container }: { container: string }) {
  return (
    <footer className={styles.footer} data-print="hide">
      <div className={cx(container, styles.footerInner)}>
        <p className={styles.privacy}>
          <Icon name="lock" size={16} />
          <span>{PRIVACY_MESSAGE}</span>
        </p>
        <nav aria-label="Rodapé">
          <ul role="list" className={styles.footerLinks}>
            <li>
              <Link to="/como-funciona">Como funciona o sorteio</Link>
            </li>
            <li>
              <Link to="/privacidade">Privacidade e termos de uso</Link>
            </li>
          </ul>
        </nav>
        <p className={styles.copy}>
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>
    </footer>
  );
}

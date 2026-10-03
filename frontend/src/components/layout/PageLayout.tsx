import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { APP_NAME, PRIVACY_MESSAGE } from "~/lib/config";
import { cx } from "../cx";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import styles from "./PageLayout.module.css";

export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={cx("container", styles.headerInner)}>
        <Link to="/" className={styles.brand} aria-label={`${APP_NAME}, página inicial`}>
          <Logo />
        </Link>
        <nav aria-label="Principal">
          <ul role="list" className={styles.nav}>
            <li>
              <NavLink
                to="/sorteio"
                className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}
              >
                Sorteio
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/como-funciona"
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

function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={cx("container", styles.footerInner)}>
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

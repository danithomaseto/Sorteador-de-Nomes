import { useId, useState } from "react";
import { Link } from "react-router";
import { cx } from "~/components/cx";
import { Icon } from "~/components/Icon";
import { PageLayout } from "~/components/layout/PageLayout";
import { Tabs, tabPanelProps } from "~/components/Tabs";
import { DrawActions } from "~/features/draw/DrawActions";
import { DrawNameEditor } from "~/features/draw/DrawNameEditor";
import { DrawSettingsPanel } from "~/features/draw/DrawSettingsPanel";
import { NewDrawButton } from "~/features/draw/NewDrawButton";
import { ParticipantsPanel } from "~/features/participants/ParticipantsPanel";
import { HistoryPanel } from "~/features/rounds/HistoryPanel";
import { MobileDrawBar } from "~/features/rounds/MobileDrawBar";
import { useSession } from "~/features/session/SessionProvider";
import { formatNumber } from "~/utils/format";
import { pageMeta } from "~/utils/seo";
import { useMediaQuery, WIDE_WORKSPACE } from "~/utils/useMediaQuery";
import styles from "./draw.module.css";

export { RouteErrorBoundary as ErrorBoundary } from "~/components/layout/RouteErrorBoundary";

export function meta() {
  return pageMeta({
    title: "Sorteio",
    description:
      "Monte a lista de participantes, escolha quantos vencedores e sorteie. Tudo no seu navegador, sem cadastro.",
    path: "/sorteio",
  });
}

type Section = "participantes" | "regras" | "historico";

/**
 * Área do sorteio. Desktop: a lista à esquerda (ocupando a altura da tela) e, à direita, regras,
 * histórico e o botão "Sortear" sempre visível. Celular: abas, com "Sortear" na barra do rodapé.
 */
export default function DrawPage() {
  const wide = useMediaQuery(WIDE_WORKSPACE);
  return (
    <PageLayout layout="app">
      <div className={cx("app-container", styles.workspace)}>
        <header className={styles.header}>
          <DrawNameEditor />
          <div className={styles.headerAside}>
            <p className={styles.privacy}>
              <Icon name="lock" size={16} />
              <span>
                Os dados ficam só nesta aba e somem ao fechá-la.{" "}
                <Link to="/privacidade">Privacidade</Link>
              </span>
            </p>
            <NewDrawButton />
          </div>
        </header>
        {wide ? <Columns /> : <Sections />}
      </div>
      {wide ? null : <MobileDrawBar />}
    </PageLayout>
  );
}

function Columns() {
  return (
    <div className={styles.columns}>
      <ParticipantsPanel fill />
      <aside className={styles.aside} aria-label="Regras e histórico">
        <div className={styles.asideScroll}>
          <DrawSettingsPanel />
          <HistoryPanel />
        </div>
        <div className={styles.asideFooter}>
          <DrawActions />
        </div>
      </aside>
    </div>
  );
}

function Sections() {
  const { state } = useSession();
  const tabsId = useId();
  const [section, setSection] = useState<Section>("participantes");
  return (
    <div className={styles.sections}>
      <Tabs<Section>
        id={tabsId}
        label="Seções do sorteio"
        className={styles.tabs}
        value={section}
        onChange={setSection}
        tabs={[
          {
            value: "participantes",
            label: "Participantes",
            count: formatNumber(state.participants.length),
          },
          { value: "regras", label: "Regras" },
          {
            value: "historico",
            label: "Histórico",
            count: state.rounds.length > 0 ? formatNumber(state.rounds.length) : undefined,
          },
        ]}
      />
      <div {...tabPanelProps(tabsId, section)} className={styles.panel}>
        {section === "participantes" ? <ParticipantsPanel hideTitle /> : null}
        {section === "regras" ? (
          <>
            <DrawSettingsPanel hideTitle />
            <DrawActions showDraw={false} />
          </>
        ) : null}
        {section === "historico" ? <HistoryPanel hideTitle /> : null}
      </div>
    </div>
  );
}

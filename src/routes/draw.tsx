import { cx } from "~/components/cx";
import { Icon } from "~/components/Icon";
import { PageLayout } from "~/components/layout/PageLayout";
import { DrawNameEditor } from "~/features/draw/DrawNameEditor";
import { DrawSettingsPanel } from "~/features/draw/DrawSettingsPanel";
import { NewDrawButton } from "~/features/draw/NewDrawButton";
import { ParticipantsPanel } from "~/features/participants/ParticipantsPanel";
import { HistoryPanel } from "~/features/rounds/HistoryPanel";
import { MobileDrawBar } from "~/features/rounds/MobileDrawBar";
import styles from "./draw.module.css";
import { pageMeta } from "~/utils/seo";

export { RouteErrorBoundary as ErrorBoundary } from "~/components/layout/RouteErrorBoundary";

export function meta() {
  return pageMeta({
    title: "Sorteio",
    description:
      "Monte a lista de participantes, escolha quantos vencedores e sorteie. Tudo no seu navegador, sem cadastro.",
    path: "/sorteio",
  });
}

export default function DrawPage() {
  return (
    <PageLayout>
      <div className={cx("container", styles.page)}>
        <header className={styles.header}>
          <DrawNameEditor />
          <div className={styles.headerAside}>
            <p className={styles.privacy}>
              <Icon name="lock" size={16} />
              Os dados ficam só nesta aba e somem ao fechá-la.
            </p>
            <NewDrawButton />
          </div>
        </header>
        <div className={styles.grid}>
          <ParticipantsPanel />
          <div className={styles.side}>
            <DrawSettingsPanel />
            <HistoryPanel />
          </div>
        </div>
      </div>
      <MobileDrawBar />
    </PageLayout>
  );
}

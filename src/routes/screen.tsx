import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import { Kbd } from "~/components/Kbd";
import { LogoMark } from "~/components/Logo";
import {
  useFullscreen,
  useIdle,
  usePresentationDocument,
  usePrimaryKey,
  useStageShortcuts,
  useWakeLock,
} from "~/features/presentation/hooks";
import { channelIdFromHash, useScreenReceiver } from "~/features/presentation/screen";
import { StageScene } from "~/features/presentation/StageScene";
import styles from "~/features/presentation/StageFrame.module.css";
import { pageMeta } from "~/utils/seo";

export { RouteErrorBoundary as ErrorBoundary } from "~/components/layout/RouteErrorBoundary";

export function meta() {
  return pageMeta({ title: "Telão", path: "/sorteio", indexable: false });
}

/**
 * Telão: janela aberta pelo modo apresentação para ser levada ao projetor. Não tem dados próprios —
 * mostra a cena que o modo apresentação envia pelo navegador (ver `features/presentation/screen.ts`).
 */
export default function ScreenPage() {
  const { hash } = useLocation();
  const [channelId] = useState(() => channelIdFromHash(hash));
  const screen = useScreenReceiver(channelId);
  const fullscreen = useFullscreen();
  const idle = useIdle(3000);
  const view = screen.view;
  usePresentationDocument(view?.theme ?? "dark");
  useWakeLock();
  usePrimaryKey(screen.status === "live" ? screen.sendPrimary : null);
  useStageShortcuts({ onFullscreen: fullscreen.toggle, fullscreenActive: fullscreen.active });

  // Duplo clique em qualquer ponto também alterna a tela cheia (atalho para quem está no projetor;
  // o botão e a tecla F são as alternativas acessíveis).
  const { supported: canFullscreen, toggle: toggleFullscreen } = fullscreen;
  useEffect(() => {
    if (!canFullscreen) return undefined;
    const onDoubleClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("button, a")) return;
      toggleFullscreen();
    };
    document.addEventListener("dblclick", onDoubleClick);
    return () => {
      document.removeEventListener("dblclick", onDoubleClick);
    };
  }, [canFullscreen, toggleFullscreen]);

  let content;
  if (view && (screen.status === "live" || screen.status === "paused")) {
    // Pausado (o apresentador voltou à lista): a plateia vê só o nome do sorteio.
    const scene =
      screen.status === "live" ? view.scene : ({ phase: "ready", prepared: false } as const);
    content = <StageScene scene={scene} drawName={view.drawName} />;
  } else if (screen.status === "closed") {
    content = (
      <Notice title="O sorteio foi encerrado">
        A janela do sorteio foi fechada. Você já pode fechar esta janela.
      </Notice>
    );
  } else if (screen.status === "waiting") {
    content = (
      <Notice title="Aguardando o modo apresentação" delayed>
        Na janela do sorteio, abra o modo apresentação. Esta tela acompanha tudo automaticamente.
      </Notice>
    );
  } else {
    content = (
      <Notice title="Telão sem conexão">
        Abra o telão pelo botão “Abrir telão”, no modo apresentação do sorteio.
      </Notice>
    );
  }

  return (
    <div className={cx(styles.stage, idle && styles.idle)}>
      <header className={styles.bar}>
        <div className={styles.brand}>
          <LogoMark size={22} />
          <span className={styles.drawName}>{view?.drawName ?? "Telão"}</span>
        </div>
        <div className={styles.controls}>
          {screen.status === "paused" ? (
            <span className={styles.roundInfo}>Apresentação pausada</span>
          ) : null}
          {fullscreen.supported ? (
            <Button
              variant="ghost"
              size="sm"
              icon={fullscreen.active ? "minimize" : "maximize"}
              onClick={fullscreen.toggle}
            >
              {fullscreen.active ? "Sair da tela cheia" : "Tela cheia"}
            </Button>
          ) : null}
        </div>
      </header>

      <main className={styles.main} aria-live="off">
        <h1 className="visually-hidden">Telão{view ? `: ${view.drawName}` : ""}</h1>
        {content}
      </main>

      <footer className={styles.footer}>
        <p className={styles.hints}>
          <Kbd>F</Kbd> ou duplo clique: tela cheia
          {screen.status === "live" ? (
            <>
              {" "}
              · <Kbd>Espaço</Kbd> avança o sorteio
            </>
          ) : null}
        </p>
      </footer>
    </div>
  );
}

function Notice({
  title,
  delayed = false,
  children,
}: {
  title: string;
  delayed?: boolean;
  children: string;
}) {
  return (
    <div className={cx(styles.notice, delayed && styles.delayed)}>
      <p className={styles.noticeTitle}>{title}</p>
      <p className={styles.noticeText}>{children}</p>
    </div>
  );
}

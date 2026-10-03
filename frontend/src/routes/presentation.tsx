import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { Button, ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { InlineAlert } from "~/components/InlineAlert";
import { Kbd } from "~/components/Kbd";
import { LogoMark } from "~/components/Logo";
import {
  usePresentationDocument,
  useFullscreen,
  useIdle,
  usePrimaryKey,
  useStageShortcuts,
  useWakeLock,
} from "~/features/presentation/hooks";
import { PresentationRound } from "~/features/presentation/PresentationRound";
import { useDrawRound } from "~/features/rounds/useDrawRound";
import { blockerMessage, drawBlocker, sessionStats } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { errorMessage } from "~/lib/api/messages";
import { APP_NAME } from "~/lib/config";
import { countLabel, formatNumber } from "~/lib/format";
import { useLimits } from "~/lib/useLimits";
import styles from "./presentation.module.css";

export { RouteErrorBoundary as ErrorBoundary } from "~/components/layout/RouteErrorBoundary";

export function meta() {
  return [{ title: `Apresentação · ${APP_NAME}` }];
}

interface Primary {
  action: (() => void) | null;
  label: string | null;
}

export default function PresentationPage() {
  const { state } = useSession();
  const limits = useLimits();
  const navigate = useNavigate();
  const draw = useDrawRound();
  const fullscreen = useFullscreen();
  const idle = useIdle(3000);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [roundPrimary, setRoundPrimary] = useState<Primary>({ action: null, label: null });
  usePresentationDocument(theme);
  useWakeLock();

  const round =
    roundNumber !== null ? state.rounds.find((r) => r.number === roundNumber) : undefined;
  const stats = sessionStats(state);
  const blocker = drawBlocker(state, limits);
  const quantity = state.settings.quantity;

  const startDraw = useCallback(async () => {
    setFinished(false);
    const number = await draw.start({ showResult: false });
    if (number !== null) setRoundNumber(number);
  }, [draw]);

  const exit = useCallback(() => {
    void navigate("/sorteio");
  }, [navigate]);

  const onPrimaryChange = useCallback((action: (() => void) | null, label: string | null) => {
    setRoundPrimary({ action, label });
  }, []);
  const onFinished = useCallback(() => {
    setFinished(true);
    setRoundPrimary({ action: null, label: null });
  }, []);

  const showStart = (!round || finished) && !draw.pending;
  const canDraw = blocker === null && !draw.pending;
  const primary =
    round && !finished ? roundPrimary.action : canDraw ? () => void startDraw() : null;
  usePrimaryKey(primary);
  useStageShortcuts({
    onFullscreen: fullscreen.toggle,
    onExit: exit,
    fullscreenActive: fullscreen.active,
  });

  const keyHints = (
    <p className={styles.hints}>
      <Kbd>Espaço</Kbd> {round && !finished ? "revelar" : "sortear"} · <Kbd>F</Kbd> tela cheia ·{" "}
      <Kbd>Esc</Kbd> sair
    </p>
  );

  return (
    <div className={cx(styles.stage, idle && styles.idle)}>
      <header className={styles.bar}>
        <div className={styles.brand}>
          <LogoMark size={22} />
          <span className={styles.drawName}>{state.name}</span>
        </div>
        <div className={styles.controls}>
          {state.rounds.length > 0 ? (
            <span className={styles.roundInfo}>
              {countLabel(state.rounds.length, "rodada", "rodadas")}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            icon={theme === "dark" ? "sun" : "moon"}
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
            }}
          >
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </Button>
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
          <Button variant="ghost" size="sm" icon="x" onClick={exit}>
            Sair
          </Button>
        </div>
      </header>

      <main className={styles.main} aria-live="off">
        <h1 className="visually-hidden">Modo apresentação: {state.name}</h1>

        {round && (!finished || !draw.pending) ? (
          <PresentationRound
            key={round.number}
            round={round}
            onPrimaryChange={onPrimaryChange}
            onFinished={onFinished}
          />
        ) : null}

        {!round ? (
          <div className={styles.ready}>
            <p className={styles.eyebrow}>Sorteio</p>
            <p className={styles.title}>{state.name}</p>
            {stats.total > 0 ? <p className={styles.question}>Preparado?</p> : null}
          </div>
        ) : null}

        {draw.error ? (
          <InlineAlert tone="error" title="Não foi possível sortear" live className={styles.alert}>
            {errorMessage(draw.error)} Nenhum resultado foi registrado. Tente de novo.
          </InlineAlert>
        ) : null}

        {showStart || draw.pending ? (
          <div className={styles.start}>
            {blocker ? (
              <>
                <p className={styles.blocker}>{blockerMessage(blocker)}</p>
                <ButtonLink to="/sorteio" variant="primary" size="lg">
                  Voltar aos participantes
                </ButtonLink>
              </>
            ) : (
              <>
                <p className={styles.meta}>
                  {formatNumber(stats.available)}{" "}
                  {stats.available === 1 ? "participante disponível" : "participantes disponíveis"}{" "}
                  · {countLabel(quantity, "vencedor", "vencedores")}
                </p>
                <Button
                  variant="primary"
                  size="xl"
                  icon="shuffle"
                  loading={draw.pending}
                  onClick={() => {
                    void startDraw();
                  }}
                >
                  {draw.pending ? "Sorteando…" : round ? "Sortear novamente" : "Sortear"}
                </Button>
              </>
            )}
          </div>
        ) : null}

        {round && !finished && roundPrimary.action && roundPrimary.label ? (
          <div className={styles.start}>
            <Button variant="primary" size="lg" onClick={roundPrimary.action}>
              {roundPrimary.label}
            </Button>
          </div>
        ) : null}
      </main>

      <footer className={styles.footer}>{keyHints}</footer>
    </div>
  );
}

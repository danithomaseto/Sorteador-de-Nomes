import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import { Button, ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { useToast } from "~/components/Toast";
import { NewDrawButton } from "~/features/draw/NewDrawButton";
import type { Round } from "~/features/session/model";
import { blockerMessage, drawBlocker } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { ordinal } from "~/services/export";
import { useAnnounce } from "~/utils/a11y/Announcer";
import { countLabel, formatDateTime, formatNumber } from "~/utils/format";
import { animationSample } from "./animationSample";
import { copyToClipboard, resultText } from "./copyResult";
import { DrawReel } from "./DrawReel";
import { ExportMenu } from "./ExportMenu";
import styles from "./ResultView.module.css";
import { useDrawRound } from "./useDrawRound";
import { useReveal } from "./useReveal";

const ANNOUNCED_NAMES = 10;
// Os três primeiros recebem destaque; listas longas viram colunas.
const HIGHLIGHTED = 3;
const COLUMNS_FROM = 12;

interface ResultViewProps {
  round: Round;
  fresh: boolean;
  onRevealFinished: () => void;
}

export function ResultView({ round, fresh, onRevealFinished }: ResultViewProps) {
  const { state } = useSession();
  const toast = useToast();
  const announce = useAnnounce();
  const draw = useDrawRound();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = round.winners.length;
  const sequential = state.settings.revealMode === "sequential" && total > 1;
  const reveal = useReveal(total, state.settings.revealMode, fresh);
  const sample = useMemo(
    () => animationSample(state.participants.map((p) => p.name)),
    [state.participants],
  );
  const blocker = drawBlocker(state);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!reveal.done) return;
    const names = round.winners
      .slice(0, ANNOUNCED_NAMES)
      .map((w) => `${ordinal(w.position)} ${w.name}`);
    const more = total > ANNOUNCED_NAMES ? `, e mais ${String(total - ANNOUNCED_NAMES)}` : "";
    announce(
      total === 1
        ? `Vencedor: ${round.winners[0]?.name ?? ""}. Parabéns!`
        : `Resultado da rodada ${String(round.number)}: ${names.join(", ")}${more}.`,
    );
    if (fresh) onRevealFinished();
  }, [announce, fresh, onRevealFinished, reveal.done, round, total]);

  const animatingWinner = reveal.animating !== null ? round.winners[reveal.animating] : undefined;
  const visible = round.winners.slice(0, reveal.revealed);
  const single = total === 1;

  async function copy() {
    const copied = await copyToClipboard(resultText(state.name, round));
    toast(
      copied
        ? { tone: "success", message: "Resultado copiado." }
        : {
            tone: "error",
            message: "Não foi possível copiar. Selecione o texto e copie manualmente.",
          },
    );
  }

  return (
    <article className={styles.result} aria-labelledby="resultado-titulo">
      <header className={styles.header}>
        <p className={styles.eyebrow}>{state.name}</p>
        <h1 id="resultado-titulo" ref={headingRef} tabIndex={-1} className={styles.title}>
          {/* Em telas estreitas a quebra fica depois do ponto, não antes. */}
          <span className={styles.keep}>Resultado ·</span> Rodada {round.number}
        </h1>
        {state.rounds.length > 1 ? (
          <nav aria-label="Rodadas" className={styles.roundNav}>
            {round.number > 1 ? (
              <Link to={`/sorteio/rodadas/${String(round.number - 1)}`}>← Rodada anterior</Link>
            ) : null}
            {round.number < state.rounds.length ? (
              <Link to={`/sorteio/rodadas/${String(round.number + 1)}`}>Próxima rodada →</Link>
            ) : null}
          </nav>
        ) : null}
      </header>

      {animatingWinner ? (
        <div className={styles.stage}>
          <DrawReel
            key={reveal.animating}
            names={sample}
            finalName={animatingWinner.name}
            label={
              sequential
                ? `Vencedor ${String((reveal.animating ?? 0) + 1)} de ${String(total)} · sorteando`
                : "Sorteando"
            }
            pace={sequential ? "quick" : "normal"}
            onDone={reveal.onAnimationDone}
          />
        </div>
      ) : null}

      {visible.length > 0 ? (
        single ? (
          <div className={styles.single}>
            <p className={styles.singleLabel}>Vencedor</p>
            <p className={styles.singleName}>{visible[0]?.name}</p>
            <p className={styles.congrats}>Parabéns!</p>
          </div>
        ) : (
          <section className={styles.list} aria-label="Vencedores, em ordem de sorteio">
            <p className={styles.listCaption}>
              {countLabel(total, "vencedor", "vencedores")} · em ordem de sorteio
            </p>
            <ol role="list" className={cx(styles.winners, total > COLUMNS_FROM && styles.columns)}>
              {visible.map((winner, index) => (
                <li
                  key={winner.position}
                  className={cx(
                    styles.winner,
                    index === 0 && styles.first,
                    index < HIGHLIGHTED && total <= COLUMNS_FROM && styles.top,
                  )}
                >
                  <span className={styles.position}>{ordinal(winner.position)}</span>
                  <span className={styles.winnerName}>{winner.name}</span>
                </li>
              ))}
            </ol>
          </section>
        )
      ) : null}

      {!reveal.done && reveal.animating === null ? (
        <div className={styles.revealActions}>
          <Button variant="primary" size="lg" onClick={reveal.next}>
            Revelar próximo ({reveal.revealed + 1} de {total})
          </Button>
          <Button onClick={reveal.revealAll}>Revelar todos</Button>
        </div>
      ) : null}

      {reveal.done ? (
        <>
          <dl className={styles.meta}>
            <div>
              <dt>Data e hora</dt>
              <dd>{formatDateTime(round.drawnAt, true)}</dd>
            </div>
            <div>
              <dt>Sorteados</dt>
              <dd className="numeric">{formatNumber(total)}</dd>
            </div>
            <div>
              <dt>Participavam</dt>
              <dd className="numeric">{formatNumber(round.poolSize)}</dd>
            </div>
            <div>
              <dt>Disponíveis depois</dt>
              <dd className="numeric">{formatNumber(round.availableAfter)}</dd>
            </div>
            <div>
              <dt>Repetição na rodada</dt>
              <dd>{round.allowRepeat ? "Permitida" : "Não"}</dd>
            </div>
            <div>
              <dt>Vencedores removidos</dt>
              <dd>{round.removeWinners ? "Sim" : "Não"}</dd>
            </div>
          </dl>

          {blocker && blocker.code !== "invalid_quantity" ? (
            <p className={styles.blocker}>{blockerMessage(blocker)}</p>
          ) : null}

          <div className={styles.actions}>
            <div className={styles.primaryActions}>
              <Button
                variant="primary"
                icon="shuffle"
                disabled={blocker !== null}
                onClick={() => {
                  draw.start();
                }}
              >
                Sortear novamente
                {blocker
                  ? ""
                  : ` (${countLabel(state.settings.quantity, "vencedor", "vencedores")})`}
              </Button>
              <Button
                icon="copy"
                onClick={() => {
                  void copy();
                }}
              >
                Copiar
              </Button>
              <ExportMenu rounds={[round]} label="Exportar" />
            </div>
            <div className={styles.secondaryActions}>
              <ButtonLink to="/sorteio" variant="ghost" icon="arrow-left">
                Voltar aos participantes
              </ButtonLink>
              <NewDrawButton variant="ghost" size="md" />
            </div>
          </div>
        </>
      ) : null}
    </article>
  );
}

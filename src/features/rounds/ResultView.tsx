import { useEffect, useMemo, useRef } from "react";
import { Button, ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { useToast } from "~/components/Toast";
import { NewDrawButton } from "~/features/draw/NewDrawButton";
import type { Round } from "~/features/session/model";
import { blockerMessage, drawBlocker } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { APP_NAME } from "~/config";
import { describeAlgorithm, ordinal } from "~/services/export";
import { useAnnounce } from "~/utils/a11y/Announcer";
import { cssVars } from "~/utils/cssVars";
import { countLabel, formatDateTime, formatNumber } from "~/utils/format";
import { animationSample } from "./animationSample";
import { copyToClipboard, resultText } from "./copyResult";
import { DrawReel } from "./DrawReel";
import { ExportMenu } from "./ExportMenu";
import styles from "./ResultView.module.css";
import { useDrawRound } from "./useDrawRound";
import { useReveal } from "./useReveal";

const ANNOUNCED_NAMES = 10;
// Vencedores nas roletas; os demais aparecem na lista logo depois.
const REEL_LIMIT = 30;
// Poucos vencedores: nomes grandes. Muitos: colunas mais estreitas.
const FEW = 3;
const MANY = 24;
// Os primeiros nomes entram em sequência; o resto aparece junto.
const STAGGERED = 16;

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
        <div className={styles.heading}>
          <p className="eyebrow">{state.name}</p>
          <h1 id="resultado-titulo" ref={headingRef} tabIndex={-1} className={styles.title}>
            {/* Em telas estreitas a quebra fica depois do ponto, não antes. */}
            <span className={styles.keep}>Resultado ·</span> Rodada {round.number}
          </h1>
        </div>
        {state.rounds.length > 1 ? (
          <nav aria-label="Rodadas" className={styles.roundNav} data-print="hide">
            {round.number > 1 ? (
              <ButtonLink
                to={`/sorteio/rodadas/${String(round.number - 1)}`}
                variant="ghost"
                size="sm"
                icon="arrow-left"
              >
                Rodada anterior
              </ButtonLink>
            ) : null}
            {round.number < state.rounds.length ? (
              <ButtonLink
                to={`/sorteio/rodadas/${String(round.number + 1)}`}
                variant="ghost"
                size="sm"
                iconEnd="chevron-right"
              >
                Próxima rodada
              </ButtonLink>
            ) : null}
          </nav>
        ) : null}
      </header>

      {/* O palco: as roletas giram e o resultado aparece no mesmo lugar. */}
      <section className={styles.stage} aria-label="Vencedores">
        {animatingWinner ? (
          <DrawReel
            key={reveal.animating}
            names={sample}
            winners={
              sequential
                ? [animatingWinner.name]
                : round.winners.slice(0, REEL_LIMIT).map((winner) => winner.name)
            }
            total={sequential ? 1 : total}
            label={
              sequential
                ? `Vencedor ${String((reveal.animating ?? 0) + 1)} de ${String(total)} · sorteando`
                : "Sorteando"
            }
            pace={sequential ? "quick" : "normal"}
            onDone={reveal.onAnimationDone}
          />
        ) : null}

        {!animatingWinner && visible.length > 0 ? (
          single ? (
            <div className={styles.single}>
              <p className={styles.stageLabel}>Vencedor</p>
              <p className={styles.singleName}>{visible[0]?.name}</p>
              <p className={styles.congrats}>Parabéns!</p>
            </div>
          ) : (
            <div className={styles.list}>
              <div className={styles.listHead}>
                <p className={styles.stageLabel}>{reveal.done ? "Parabéns!" : "Vencedores"}</p>
                <p className={styles.listCaption}>
                  {countLabel(total, "vencedor", "vencedores")} · em ordem de sorteio
                </p>
              </div>
              <ol
                role="list"
                className={cx(
                  styles.winners,
                  total <= FEW && styles.few,
                  total > MANY && styles.many,
                )}
              >
                {visible.map((winner, index) => (
                  <li
                    key={winner.position}
                    className={styles.winner}
                    style={cssVars({ "--i": Math.min(index, STAGGERED) })}
                  >
                    <span className={styles.position}>{ordinal(winner.position)}</span>
                    <span className={styles.winnerName}>{winner.name}</span>
                  </li>
                ))}
              </ol>
            </div>
          )
        ) : null}

        {!reveal.done && reveal.animating === null ? (
          <div className={styles.revealActions} data-print="hide">
            <Button variant="primary" size="lg" onClick={reveal.next}>
              Revelar próximo ({reveal.revealed + 1} de {total})
            </Button>
            <Button variant="ghost" onClick={reveal.revealAll}>
              Revelar todos
            </Button>
          </div>
        ) : null}
      </section>

      {reveal.done ? (
        <>
          <div className={styles.actions} data-print="hide">
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
              <ExportMenu rounds={[round]} label="Exportar" single />
            </div>
            <div className={styles.secondaryActions}>
              <ButtonLink to="/sorteio" variant="ghost" icon="arrow-left">
                Voltar aos participantes
              </ButtonLink>
              <NewDrawButton variant="ghost" size="md" />
            </div>
          </div>

          {blocker && blocker.code !== "invalid_quantity" ? (
            <p className={styles.blocker} data-print="hide">
              {blockerMessage(blocker)}
            </p>
          ) : null}

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

          <p className={cx(styles.printNote, "print-only")}>
            Rodada realizada no navegador em {formatDateTime(round.drawnAt, true)}.{" "}
            {describeAlgorithm(round.algorithm)} Gerado pelo {APP_NAME}: nenhum dado do sorteio foi
            enviado a servidores.
          </p>
        </>
      ) : null}
    </article>
  );
}

import { useVirtualizer, useWindowVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import type { Participant } from "~/features/session/model";
import { cssVars } from "~/utils/cssVars";
import { formatNumber } from "~/utils/format";
import { useMediaQuery } from "~/utils/useMediaQuery";
import styles from "./ParticipantList.module.css";

interface ParticipantListProps {
  items: readonly Participant[];
  /** Posição (1, 2, 3…) de cada participante na lista completa, mesmo com filtro. */
  positions: ReadonlyMap<string, number>;
  duplicates: ReadonlySet<string>;
  onEdit: (participant: Participant) => void;
  onRemove: (participant: Participant) => void;
  disabled?: boolean;
  /**
   * "element": a lista ocupa a altura do painel e rola por dentro (desktop).
   * "window": a lista rola com a página, sem área de rolagem presa (celular).
   */
  scroll?: "element" | "window";
}

// Altura fixa das linhas (igual ao CSS): mantém as colunas alinhadas, linha a linha.
const ROW_HEIGHT = 44;
const ROW_HEIGHT_TOUCH = 52;
// Largura mínima de cada coluna de nomes.
const MIN_LANE_WIDTH = 272;
const MAX_LANES = 4;
const OVERSCAN = 8;

function laneCount(width: number): number {
  if (width <= 0) return 1;
  return Math.max(1, Math.min(MAX_LANES, Math.floor(width / MIN_LANE_WIDTH)));
}

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return width;
}

/**
 * Lista virtualizada: só as linhas visíveis existem no DOM, então 50 mil nomes rolam sem travar.
 * Em telas largas os nomes se distribuem em colunas, na ordem da lista, linha a linha. Leitores de
 * tela recebem o total e a posição de cada item (aria-setsize/aria-posinset).
 */
export function ParticipantList({ scroll = "element", ...props }: ParticipantListProps) {
  return scroll === "window" ? <WindowList {...props} /> : <ElementList {...props} />;
}

type ListProps = Omit<ParticipantListProps, "scroll">;

function ElementList(props: ListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lanes = laneCount(useWidth(scrollRef));
  const rowHeight = useMediaQuery("(pointer: coarse)") ? ROW_HEIGHT_TOUCH : ROW_HEIGHT;
  // eslint-disable-next-line react-hooks/incompatible-library -- o virtualizador gerencia o próprio estado
  const virtualizer = useVirtualizer({
    count: props.items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
    lanes,
    getItemKey: (index) => props.items[index]?.id ?? index,
    initialRect: { width: 640, height: 480 },
  });

  return (
    <div className={styles.frame}>
      <div
        ref={scrollRef}
        className={styles.scroller}
        tabIndex={0}
        role="region"
        aria-label="Lista de participantes"
      >
        <Rows {...props} virtualizer={virtualizer} lanes={lanes} offset={0} />
      </div>
    </div>
  );
}

function WindowList(props: ListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const lanes = laneCount(useWidth(listRef));
  const rowHeight = useMediaQuery("(pointer: coarse)") ? ROW_HEIGHT_TOUCH : ROW_HEIGHT;
  // Distância entre o topo da página e a lista (muda quando avisos aparecem acima dela).
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const top = listRef.current?.getBoundingClientRect().top ?? 0;
      setOffset(top + window.scrollY);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      observer.disconnect();
    };
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: props.items.length,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
    lanes,
    scrollMargin: offset,
    getItemKey: (index) => props.items[index]?.id ?? index,
    initialRect: { width: 390, height: 800 },
  });

  return (
    <div ref={listRef} className={styles.flow}>
      <Rows {...props} virtualizer={virtualizer} lanes={lanes} offset={offset} />
    </div>
  );
}

interface RowsProps extends ListProps {
  virtualizer: Virtualizer<HTMLDivElement, Element> | Virtualizer<Window, Element>;
  lanes: number;
  offset: number;
}

function Rows({
  items,
  positions,
  duplicates,
  onEdit,
  onRemove,
  disabled,
  virtualizer,
  lanes,
  offset,
}: RowsProps) {
  return (
    <ul
      role="list"
      className={styles.list}
      style={{
        height: Math.ceil(virtualizer.getTotalSize()),
        ...cssVars({ "--lanes": lanes }),
      }}
    >
      {virtualizer.getVirtualItems().map((row) => {
        const participant = items[row.index];
        if (!participant) return null;
        const removed = participant.removedInRound !== null;
        return (
          <li
            key={row.key}
            aria-setsize={items.length}
            aria-posinset={row.index + 1}
            className={cx(styles.row, removed && styles.removed)}
            style={{
              transform: `translateY(${String(row.start - offset)}px)`,
              ...cssVars({ "--lane": row.lane }),
            }}
          >
            <span className={cx(styles.index, "numeric")} aria-hidden="true">
              {formatNumber(positions.get(participant.id) ?? row.index + 1)}
            </span>
            <span className={styles.name} title={participant.name}>
              {participant.name}
            </span>
            {removed || duplicates.has(participant.key) ? (
              <span
                className={styles.badges}
                // Em colunas estreitas os selos mostram só o ícone: o texto aparece ao passar o mouse.
                title={[
                  removed ? `Sorteado na rodada ${String(participant.removedInRound)}` : "",
                  duplicates.has(participant.key) ? "Possível duplicado" : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                {removed ? (
                  <Badge tone="success" icon="check">
                    <span className={styles.badgeText}>
                      Sorteado na rodada {participant.removedInRound}
                    </span>
                  </Badge>
                ) : null}
                {duplicates.has(participant.key) ? (
                  <Badge tone="warning" icon="alert">
                    <span className={styles.badgeText}>Possível duplicado</span>
                  </Badge>
                ) : null}
              </span>
            ) : null}
            <span className={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                icon="pencil"
                aria-label={`Editar ${participant.name}`}
                disabled={disabled}
                onClick={() => {
                  onEdit(participant);
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                aria-label={`Excluir ${participant.name}`}
                disabled={disabled}
                onClick={() => {
                  onRemove(participant);
                }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

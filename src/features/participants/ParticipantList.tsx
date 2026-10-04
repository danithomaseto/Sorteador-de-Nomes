import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Badge } from "~/components/Badge";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import type { Participant } from "~/features/session/model";
import { formatNumber } from "~/utils/format";
import styles from "./ParticipantList.module.css";

interface ParticipantListProps {
  items: readonly Participant[];
  /** Posição (1, 2, 3…) de cada participante na lista completa, mesmo com filtro. */
  positions: ReadonlyMap<string, number>;
  duplicates: ReadonlySet<string>;
  onEdit: (participant: Participant) => void;
  onRemove: (participant: Participant) => void;
  disabled?: boolean;
}

const ROW_ESTIMATE = 52;

/**
 * Lista virtualizada: só as linhas visíveis existem no DOM, então 50 mil nomes rolam sem travar.
 * Leitores de tela recebem o total e a posição de cada item (aria-setsize/aria-posinset).
 */
export function ParticipantList({
  items,
  positions,
  duplicates,
  onEdit,
  onRemove,
  disabled,
}: ParticipantListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- o virtualizador gerencia o próprio estado
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 12,
    getItemKey: (index) => items[index]?.id ?? index,
    initialRect: { width: 640, height: 480 },
  });

  return (
    <div
      ref={scrollRef}
      className={styles.scroller}
      tabIndex={0}
      role="region"
      aria-label="Lista de participantes"
    >
      <ul role="list" className={styles.list} style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const participant = items[row.index];
          if (!participant) return null;
          const removed = participant.removedInRound !== null;
          return (
            <li
              key={row.key}
              ref={virtualizer.measureElement}
              data-index={row.index}
              aria-setsize={items.length}
              aria-posinset={row.index + 1}
              className={cx(styles.row, removed && styles.removed)}
              style={{ transform: `translateY(${String(row.start)}px)` }}
            >
              <span className={cx(styles.index, "numeric")} aria-hidden="true">
                {formatNumber(positions.get(participant.id) ?? row.index + 1)}
              </span>
              <span className={styles.main}>
                <span className={styles.name}>{participant.name}</span>
                {removed ? (
                  <Badge tone="success" icon="check">
                    Sorteado na rodada {participant.removedInRound}
                  </Badge>
                ) : null}
                {duplicates.has(participant.key) ? (
                  <Badge tone="warning">Possível duplicado</Badge>
                ) : null}
              </span>
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
    </div>
  );
}

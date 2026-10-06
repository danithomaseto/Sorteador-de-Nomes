/**
 * Distribuição dos vencedores em roletas lado a lado, todas girando ao mesmo tempo.
 *
 * Cada roleta para em um ou mais vencedores (a faixa amarela marca um por linha). A leitura segue
 * a ordem do sorteio, linha a linha: com 10 vencedores em 5 roletas, a primeira linha de faixas
 * tem do 1º ao 5º e a segunda, do 6º ao 10º.
 */
export interface ReelLayout {
  /** Quantas roletas. */
  readonly columns: number;
  /** Quantos vencedores cada roleta mostra (linhas de faixa). */
  readonly rows: number;
  /** Quantos vencedores aparecem nas roletas (os primeiros, se não couberem todos). */
  readonly shown: number;
}

export interface ReelLimits {
  readonly maxColumns: number;
  readonly maxRows: number;
}

export function reelLayout(count: number, { maxColumns, maxRows }: ReelLimits): ReelLayout {
  const columnsLimit = Math.max(1, Math.floor(maxColumns));
  const rowsLimit = Math.max(1, Math.floor(maxRows));
  const shown = Math.max(0, Math.min(count, columnsLimit * rowsLimit));
  if (shown === 0) return { columns: 1, rows: 1, shown: 0 };
  const rows = Math.ceil(shown / Math.min(shown, columnsLimit));
  // Com as linhas definidas, usa só as roletas necessárias: a última linha fica o mais cheia
  // possível (7 vencedores = 4 roletas, não 6 com metade vazia).
  return { columns: Math.ceil(shown / rows), rows, shown };
}

/** Vencedor (índice na ordem do sorteio) de cada linha de cada roleta; `null` = linha vazia. */
export function reelSlots(layout: ReelLayout): (number | null)[][] {
  return Array.from({ length: layout.columns }, (_, column) =>
    Array.from({ length: layout.rows }, (_, row) => {
      const index = row * layout.columns + column;
      return index < layout.shown ? index : null;
    }),
  );
}

/** Roletas que cabem na largura disponível, sem que os nomes fiquem ilegíveis. */
export function maxReelColumns(width: number, minReelWidth: number, limit = 6): number {
  if (!Number.isFinite(width) || width <= 0) return limit;
  return Math.max(1, Math.min(limit, Math.floor(width / minReelWidth)));
}

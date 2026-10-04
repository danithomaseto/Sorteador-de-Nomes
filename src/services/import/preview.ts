/**
 * Pré-visualização: transforma valores brutos em participantes válidos.
 *
 * Cada valor é normalizado (ver `services/names.ts`) e classificado como válido, vazio (ignorado)
 * ou inválido (com motivo). Duplicados são agrupados e apontados aqui; quem decide se ficam ou
 * saem é a pessoa, na tela de revisão.
 */
import { LIMITS } from "~/config";
import { matchKey, nameProblem, normalizeName } from "~/services/names";
import { hasContent, textCell } from "./cells";
import { chooseColumn, describeColumns, detectHeader } from "./columns";
import { ImportError } from "./errors";
import type {
  Cell,
  DuplicateGroup,
  HeaderOption,
  ImportEntry,
  ImportIssue,
  ImportPreview,
  ImportSource,
  Row,
  Separator,
} from "./types";

// Listas devolvidas à interface são truncadas; os totais ficam em `stats`.
const MAX_LISTED_ISSUES = 100;
const MAX_LISTED_GROUPS = 100;
const MAX_GROUP_ROWS = 20;

const EMPTY_TABLE_FIELDS = {
  separator: null,
  hasHeader: false,
  columns: [],
  column: null,
  sheets: [],
  sheet: null,
} as const;

/** Classifica valores numerados (linha ou item de origem). */
export function classify(
  cells: Iterable<readonly [row: number, cell: Cell | undefined]>,
  source: ImportSource,
): ImportPreview {
  const entries: ImportEntry[] = [];
  const issues: ImportIssue[] = [];
  const rowsByKey = new Map<string, number[]>();
  const firstNameByKey = new Map<string, string>();
  let rows = 0;
  let empty = 0;
  let invalid = 0;
  let dates = 0;

  for (const [row, cell] of cells) {
    rows += 1;
    if (cell?.kind === "error") {
      invalid += 1;
      if (issues.length < MAX_LISTED_ISSUES) issues.push({ row, code: "cell_error" });
      continue;
    }
    const name = normalizeName(cell?.text ?? "");
    const problem = nameProblem(name);
    if (problem === "empty") {
      empty += 1;
      continue;
    }
    if (problem === "too_long") {
      invalid += 1;
      if (issues.length < MAX_LISTED_ISSUES) issues.push({ row, code: "too_long" });
      continue;
    }
    if (cell?.kind === "date") dates += 1;
    const key = matchKey(name);
    let keyRows = rowsByKey.get(key);
    if (!keyRows) {
      keyRows = [];
      rowsByKey.set(key, keyRows);
      firstNameByKey.set(key, name);
    }
    entries.push({ row, name, key, repeatOf: keyRows[0] ?? null });
    keyRows.push(row);
  }

  const groups: DuplicateGroup[] = [];
  let duplicates = 0;
  for (const [key, keyRows] of rowsByKey) {
    if (keyRows.length < 2) continue;
    duplicates += keyRows.length - 1;
    groups.push({
      name: firstNameByKey.get(key) ?? "",
      count: keyRows.length,
      rows: keyRows.slice(0, MAX_GROUP_ROWS),
    });
  }

  return {
    source,
    entries,
    issues,
    duplicateGroups: groups.slice(0, MAX_LISTED_GROUPS),
    stats: {
      rows,
      valid: entries.length,
      empty,
      invalid,
      duplicates,
      duplicateGroups: groups.length,
      dates,
    },
    ...EMPTY_TABLE_FIELDS,
    maxNameLength: LIMITS.maxNameLength,
  };
}

/** Texto sem colunas: cada item é um valor. */
export function previewItems(
  items: readonly (readonly [number, string])[],
  separator: Separator,
): ImportPreview {
  const preview = classify(
    items.map(([row, text]) => [row, textCell(text)] as const),
    "text",
  );
  return { ...preview, separator };
}

export interface TableOptions {
  readonly header: HeaderOption;
  readonly column: number | null;
}

/** Tabela (CSV, planilha ou colunas coladas): escolhe cabeçalho e coluna e classifica. */
export function previewTable(
  rows: readonly Row[],
  source: ImportSource,
  { header, column }: TableOptions,
): ImportPreview {
  const first = rows.findIndex((row) => row.some(hasContent));
  if (first === -1) return { ...classify([], source), column };
  const width = Math.min(
    LIMITS.maxColumns,
    rows.reduce((widest, row) => Math.max(widest, row.length), 0),
  );
  const hasHeader = header === "auto" ? detectHeader(rows, first) : header === "yes";
  const headerIndex = hasHeader ? first : null;
  const dataStart = hasHeader ? first + 1 : first;
  if (column !== null && !(column >= 0 && column < width)) {
    throw new ImportError("column_not_found");
  }
  const chosen = column ?? chooseColumn(rows, headerIndex, dataStart, width);

  function* cells(): Generator<readonly [number, Cell | undefined]> {
    for (let index = dataStart; index < rows.length; index += 1) {
      yield [index + 1, rows[index]?.[chosen]];
    }
  }

  const preview = classify(cells(), source);
  return {
    ...preview,
    hasHeader,
    columns: describeColumns(rows, headerIndex, dataStart, width),
    column: chosen,
  };
}

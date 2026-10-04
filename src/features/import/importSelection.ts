import type { ImportPreview } from "~/services/import";
import type { NormalizedEntry } from "~/features/session/model";

/** O que fazer com nomes repetidos: o padrão é manter (podem ser pessoas diferentes). */
export type DuplicatePolicy = "keep-all" | "skip-repeated";

export interface ImportSelection {
  readonly found: number;
  /** Repetições dentro do próprio texto/arquivo (além da primeira ocorrência). */
  readonly repeatedInSource: number;
  /** Nomes que já estão na lista atual. */
  readonly alreadyInList: number;
  readonly selected: readonly NormalizedEntry[];
}

export function selectImport(
  preview: Pick<ImportPreview, "entries">,
  existingKeys: ReadonlySet<string>,
  policy: DuplicatePolicy,
): ImportSelection {
  let repeatedInSource = 0;
  let alreadyInList = 0;
  const selected: NormalizedEntry[] = [];
  for (const entry of preview.entries) {
    const repeated = entry.repeatOf !== null;
    const existing = !repeated && existingKeys.has(entry.key);
    if (repeated) repeatedInSource += 1;
    if (existing) alreadyInList += 1;
    if (policy === "keep-all" || (!repeated && !existing)) {
      selected.push({ name: entry.name, key: entry.key });
    }
  }
  return { found: preview.entries.length, repeatedInSource, alreadyInList, selected };
}

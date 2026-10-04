import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ImportPreview, RoundRequest, RoundResult } from "~/lib/api/client";
import { DEFAULT_LIMITS } from "~/lib/useLimits";

/** Versão simplificada da pré-visualização do servidor (normalização de espaços e chave). */
export function fakePreview(text: string): ImportPreview {
  const firstRow = new Map<string, number>();
  const entries: ImportPreview["entries"] = [];
  const issues: ImportPreview["issues"] = [];
  let empty = 0;
  text.split("\n").forEach((line, index) => {
    const row = index + 1;
    const name = line.split(/\s+/).filter(Boolean).join(" ");
    if (!name) {
      empty += 1;
      return;
    }
    if (name.length > 120) {
      issues.push({ row, code: "too_long" });
      return;
    }
    const key = name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    entries.push({ row, name, key, repeat_of: firstRow.get(key) ?? null });
    if (!firstRow.has(key)) firstRow.set(key, row);
  });
  const duplicates = entries.filter((entry) => entry.repeat_of !== null).length;
  return {
    source: "text",
    entries,
    issues,
    duplicate_groups: [],
    stats: {
      rows: entries.length + empty + issues.length,
      valid: entries.length,
      empty,
      invalid: issues.length,
      duplicates,
      duplicate_groups: duplicates > 0 ? 1 : 0,
      dates: 0,
    },
    separator: "newline",
    has_header: false,
    columns: [],
    column: null,
    sheets: [],
    sheet: null,
    max_name_length: 120,
  };
}

export const handlers = [
  http.get("*/api/v1/limits", () => HttpResponse.json(DEFAULT_LIMITS)),
  http.post("*/api/v1/imports/text", async ({ request }) => {
    const body = (await request.json()) as { text: string };
    return HttpResponse.json(fakePreview(body.text));
  }),
  http.post("*/api/v1/rounds", async ({ request }) => {
    const body = (await request.json()) as RoundRequest;
    const result: RoundResult = {
      positions: Array.from({ length: body.quantity }, (_, i) => i % body.pool_size),
      pool_size: body.pool_size,
      quantity: body.quantity,
      allow_repeat: body.allow_repeat,
      algorithm: "partial-fisher-yates/1+os-csprng",
      drawn_at: "2026-10-03T21:35:12Z",
    };
    return HttpResponse.json(result);
  }),
];

export const server = setupServer(...handlers);

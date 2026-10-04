import { describe, expect, it } from "vitest";
import { makeXlsx } from "~/test/xlsx";
import { previewFile, previewText } from "./parse";

const COUNT = 50_000;
const names = Array.from(
  { length: COUNT },
  (_, i) => `Participante ${String(i).padStart(5, "0")} Silva`,
);

function timed<T>(run: () => T): { result: T; ms: number } {
  const started = performance.now();
  const result = run();
  return { result, ms: performance.now() - started };
}

// Limites folgados para não oscilar em máquinas lentas de CI; os tempos típicos ficam no log.
describe("desempenho com 50 mil participantes", () => {
  it("texto colado", () => {
    const { result, ms } = timed(() =>
      previewText(names.join("\n"), { separator: "auto", header: "auto", column: null }),
    );
    console.info(`texto: ${ms.toFixed(0)} ms`);
    expect(result.stats.valid).toBe(COUNT);
    expect(ms).toBeLessThan(3000);
  });

  it("CSV com três colunas", () => {
    const csv = ["Nome;Matrícula;Área", ...names.map((name, i) => `${name};${String(i)};RH`)].join(
      "\n",
    );
    const { result, ms } = timed(() =>
      previewFile(new TextEncoder().encode(csv), {
        sheet: null,
        header: "auto",
        column: null,
        delimiter: "auto",
        formatHint: "csv",
      }),
    );
    console.info(`csv: ${ms.toFixed(0)} ms`);
    expect(result.stats.valid).toBe(COUNT);
    expect(ms).toBeLessThan(4000);
  });

  it("planilha .xlsx com três colunas", () => {
    const bytes = makeXlsx([
      {
        name: "Lista",
        rows: [["Nome", "Matrícula", "Área"], ...names.map((name, i) => [name, i, "RH"])],
      },
    ]);
    const { result, ms } = timed(() =>
      previewFile(bytes, {
        sheet: null,
        header: "auto",
        column: null,
        delimiter: "auto",
        formatHint: null,
      }),
    );
    console.info(`xlsx: ${ms.toFixed(0)} ms (${(bytes.length / 1024 / 1024).toFixed(1)} MB)`);
    expect(result.stats.valid).toBe(COUNT);
    expect(ms).toBeLessThan(6000);
  });
});

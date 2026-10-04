/**
 * Testes estatísticos: o algoritmo não pode favorecer participantes nem posições.
 *
 * Com seed fixa, são determinísticos (nunca oscilam no CI). O limite é o valor crítico do
 * qui-quadrado para α = 0,001: um algoritmo correto passa; um erro clássico (trocar com uma
 * posição em [0, n) em vez de [i, n)) falha.
 */
import { describe, expect, it } from "vitest";
import { SeededRandomSource } from "~/test/random";
import { drawPositions } from "./engine";

const CHI2_CRITICAL_0001: Record<number, number> = { 5: 20.515, 8: 26.124, 9: 27.877, 11: 31.264 };

function chiSquare(counts: ReadonlyMap<string, number>, categories: number, total: number): number {
  const expected = total / categories;
  let sum = (categories - counts.size) * expected; // categorias que nunca saíram
  for (const observed of counts.values()) sum += (observed - expected) ** 2 / expected;
  return sum;
}

function tally(trials: number, sample: () => readonly number[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (let trial = 0; trial < trials; trial += 1) {
    const key = sample().join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

describe("uniformidade", () => {
  it("cada participante tem a mesma chance", () => {
    const random = new SeededRandomSource(2026);
    const counts = tally(
      50_000,
      () => drawPositions(10, 1, { allowRepeat: false, random }).positions,
    );
    expect(chiSquare(counts, 10, 50_000)).toBeLessThan(CHI2_CRITICAL_0001[9] ?? 0);
  });

  it("cada posição do resultado é uniforme", () => {
    const random = new SeededRandomSource(31);
    const perPosition = [
      new Map<string, number>(),
      new Map<string, number>(),
      new Map<string, number>(),
    ];
    for (let trial = 0; trial < 30_000; trial += 1) {
      drawPositions(6, 3, { allowRepeat: false, random }).positions.forEach((winner, position) => {
        const counts = perPosition[position];
        counts?.set(String(winner), (counts.get(String(winner)) ?? 0) + 1);
      });
    }
    for (const counts of perPosition) {
      expect(chiSquare(counts, 6, 30_000)).toBeLessThan(CHI2_CRITICAL_0001[5] ?? 0);
    }
  });

  it("todas as sequências ordenadas são equiprováveis", () => {
    const random = new SeededRandomSource(77);
    const counts = tally(
      24_000,
      () => drawPositions(4, 2, { allowRepeat: false, random }).positions,
    );
    expect(counts.size).toBe(12); // 4 × 3 sequências possíveis
    expect(chiSquare(counts, 12, 24_000)).toBeLessThan(CHI2_CRITICAL_0001[11] ?? 0);
  });

  it("com repetição, os pares são independentes e uniformes", () => {
    const random = new SeededRandomSource(5);
    const counts = tally(
      27_000,
      () => drawPositions(3, 2, { allowRepeat: true, random }).positions,
    );
    expect(counts.size).toBe(9);
    expect(chiSquare(counts, 9, 27_000)).toBeLessThan(CHI2_CRITICAL_0001[8] ?? 0);
  });
});

describe("desempenho", () => {
  it("sorteia 10 entre 50 mil e embaralha 50 mil rapidamente", () => {
    const random = new SeededRandomSource(1);
    const started = performance.now();
    drawPositions(50_000, 10, { allowRepeat: false, random });
    drawPositions(50_000, 50_000, { allowRepeat: false, random });
    expect(performance.now() - started).toBeLessThan(500);
  });
});

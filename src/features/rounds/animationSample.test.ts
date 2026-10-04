import { describe, expect, it } from "vitest";
import { animationSample } from "./animationSample";

describe("amostra da animação", () => {
  it("limita o tamanho em listas grandes", () => {
    const names = Array.from({ length: 50_000 }, (_, i) => `P${String(i)}`);
    const sample = animationSample(names);
    expect(sample).toHaveLength(40);
    expect(new Set(sample).size).toBe(40);
    expect(sample.every((name) => names.includes(name))).toBe(true);
  });

  it("repete nomes em listas pequenas", () => {
    expect(animationSample(["Ana", "Bia"])).toHaveLength(8);
  });

  it("lista vazia não gera quadros", () => {
    expect(animationSample([])).toEqual([]);
  });
});

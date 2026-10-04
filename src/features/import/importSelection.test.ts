import { describe, expect, it } from "vitest";
import { selectImport } from "./importSelection";

const preview = {
  entries: [
    { row: 1, name: "Ana", key: "ana", repeatOf: null },
    { row: 2, name: "Bia", key: "bia", repeatOf: null },
    { row: 3, name: "ana", key: "ana", repeatOf: 1 },
    { row: 4, name: "Caio", key: "caio", repeatOf: null },
  ],
};

describe("seleção de importação", () => {
  it("mantém todos por padrão e conta repetidos", () => {
    const result = selectImport(preview, new Set(["caio"]), "keep-all");
    expect(result.found).toBe(4);
    expect(result.repeatedInSource).toBe(1);
    expect(result.alreadyInList).toBe(1);
    expect(result.selected.map((e) => e.name)).toEqual(["Ana", "Bia", "ana", "Caio"]);
  });

  it("ignora repetidos do arquivo e nomes que já estão na lista", () => {
    const result = selectImport(preview, new Set(["caio"]), "skip-repeated");
    expect(result.selected.map((e) => e.name)).toEqual(["Ana", "Bia"]);
  });
});

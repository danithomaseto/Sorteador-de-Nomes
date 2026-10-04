import { describe, expect, it } from "vitest";
import { fitText } from "./image";

// Medida fictícia: 10 px por caractere.
const context = {
  measureText: (text: string) => ({ width: Array.from(text).length * 10 }),
} as Pick<CanvasRenderingContext2D, "measureText">;

describe("texto na imagem do resultado", () => {
  it("mantém o texto que cabe", () => {
    expect(fitText(context, "Ana Lima", 80)).toBe("Ana Lima");
  });

  it("corta com reticências no maior trecho que cabe", () => {
    expect(fitText(context, "Maria Aparecida", 80)).toBe("Maria A…");
    expect(fitText(context, "Maria Aparecida", 80).length * 10).toBeLessThanOrEqual(80);
  });

  it("não corta no meio de um emoji ou acento composto", () => {
    const smile = String.fromCodePoint(0x1f600);
    expect(fitText(context, `${smile}${smile}${smile}${smile}`, 30)).toBe(`${smile}${smile}…`);
  });
});

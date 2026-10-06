import { describe, expect, it } from "vitest";
import { maxReelColumns, reelLayout, reelSlots } from "./reelLayout";

const DESKTOP = { maxColumns: 6, maxRows: 5 };

describe("distribuição nas roletas", () => {
  it("um vencedor: uma roleta", () => {
    expect(reelLayout(1, DESKTOP)).toEqual({ columns: 1, rows: 1, shown: 1 });
  });

  it("poucos vencedores: uma roleta para cada", () => {
    expect(reelLayout(3, DESKTOP)).toEqual({ columns: 3, rows: 1, shown: 3 });
    expect(reelLayout(6, DESKTOP)).toEqual({ columns: 6, rows: 1, shown: 6 });
  });

  it("10 vencedores: 5 roletas com 2 em cada", () => {
    expect(reelLayout(10, DESKTOP)).toEqual({ columns: 5, rows: 2, shown: 10 });
  });

  it("a última linha fica o mais cheia possível", () => {
    expect(reelLayout(7, DESKTOP)).toEqual({ columns: 4, rows: 2, shown: 7 });
    expect(reelLayout(20, DESKTOP)).toEqual({ columns: 5, rows: 4, shown: 20 });
  });

  it("muitos vencedores: só os primeiros aparecem nas roletas", () => {
    expect(reelLayout(500, DESKTOP)).toEqual({ columns: 6, rows: 5, shown: 30 });
  });

  it("tela estreita: menos roletas, mais linhas", () => {
    expect(reelLayout(10, { maxColumns: 2, maxRows: 5 })).toEqual({
      columns: 2,
      rows: 5,
      shown: 10,
    });
  });

  it("ordem do sorteio linha a linha", () => {
    expect(reelSlots(reelLayout(7, DESKTOP))).toEqual([
      [0, 4],
      [1, 5],
      [2, 6],
      [3, null],
    ]);
  });

  it("roletas que cabem na largura", () => {
    expect(maxReelColumns(1100, 180)).toBe(6);
    expect(maxReelColumns(360, 160)).toBe(2);
    expect(maxReelColumns(100, 160)).toBe(1);
    expect(maxReelColumns(0, 160)).toBe(6);
  });
});

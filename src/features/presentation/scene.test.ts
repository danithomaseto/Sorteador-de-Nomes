import { describe, expect, it } from "vitest";
import { GRID_LIMIT, roundScene } from "./scene";

const winners = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ position: i + 1, name: `Pessoa ${String(i + 1)}` }));
const sample = ["Ana", "Bruno", "Carla"];

describe("cena do palco", () => {
  it("rolo enquanto o vencedor é sorteado", () => {
    expect(
      roundScene({
        roundNumber: 2,
        winners: winners(1),
        revealed: 0,
        animating: 0,
        sequential: false,
        sample,
      }),
    ).toEqual({
      phase: "reel",
      id: "2:0",
      names: sample,
      finalName: "Pessoa 1",
      label: "Sorteando",
      pace: "normal",
    });
  });

  it("um vencedor: destaque com Parabéns", () => {
    const scene = roundScene({
      roundNumber: 1,
      winners: winners(1),
      revealed: 1,
      animating: null,
      sequential: false,
      sample,
    });
    expect(scene).toEqual({ phase: "single", heading: "Parabéns!", name: "Pessoa 1" });
  });

  it("um a um: rolo rápido e o vencedor da vez", () => {
    const base = { roundNumber: 1, winners: winners(3), sequential: true, sample };
    expect(roundScene({ ...base, revealed: 1, animating: 1 })).toMatchObject({
      phase: "reel",
      id: "1:1",
      finalName: "Pessoa 2",
      label: "Vencedor 2 de 3 · sorteando",
      pace: "quick",
    });
    expect(roundScene({ ...base, revealed: 2, animating: null })).toEqual({
      phase: "single",
      heading: "Vencedor 2 de 3",
      name: "Pessoa 2",
    });
    expect(roundScene({ ...base, revealed: 3, animating: null })).toMatchObject({
      phase: "grid",
      total: 3,
    });
  });

  it("lista limitada no palco, só com posição e nome", () => {
    const many = winners(45).map((w) => ({ ...w, participantId: `p${String(w.position)}` }));
    const scene = roundScene({
      roundNumber: 1,
      winners: many,
      revealed: 45,
      animating: null,
      sequential: false,
      sample,
    });
    expect(scene.phase).toBe("grid");
    if (scene.phase !== "grid") return;
    expect(scene.total).toBe(45);
    expect(scene.winners).toHaveLength(GRID_LIMIT);
    expect(scene.winners[0]).toEqual({ position: 1, name: "Pessoa 1" });
  });
});

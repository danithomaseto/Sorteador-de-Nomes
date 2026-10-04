import { describe, expect, it } from "vitest";
import { SeededRandomSource, SequenceRandomSource } from "~/test/random";
import { DrawError, drawPositions, WITH_REPETITION, WITHOUT_REPETITION } from "./engine";
import { CryptoRandomSource } from "./random";

const seeded = (seed = 1) => new SeededRandomSource(seed);

function drawError(run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (error) {
    return error instanceof DrawError ? error.code : "outro erro";
  }
}

describe("validação", () => {
  it("lista vazia gera erro, com ou sem repetição", () => {
    expect(drawError(() => drawPositions(0, 1, { allowRepeat: false, random: seeded() }))).toBe(
      "empty_pool",
    );
    expect(drawError(() => drawPositions(0, 1, { allowRepeat: true, random: seeded() }))).toBe(
      "empty_pool",
    );
  });

  it.each([0, -1, 1.5, Number.NaN])("quantidade inválida (%s) gera erro", (quantity) => {
    expect(
      drawError(() => drawPositions(5, quantity, { allowRepeat: false, random: seeded() })),
    ).toBe("invalid_quantity");
  });

  it("sem repetição, não sorteia mais que os participantes", () => {
    expect(drawError(() => drawPositions(5, 10, { allowRepeat: false, random: seeded() }))).toBe(
      "insufficient_participants",
    );
  });
});

describe("sem repetição", () => {
  it("um participante", () => {
    const outcome = drawPositions(1, 1, { allowRepeat: false, random: seeded() });
    expect(outcome.positions).toEqual([0]);
  });

  it("vencedores nunca se repetem e ficam dentro da lista", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const { positions } = drawPositions(30, 10, { allowRepeat: false, random: seeded(seed) });
      expect(new Set(positions).size).toBe(10);
      expect(positions.every((p) => Number.isInteger(p) && p >= 0 && p < 30)).toBe(true);
    }
  });

  it("quantidade igual ao total gera uma permutação completa", () => {
    const { positions } = drawPositions(8, 8, { allowRepeat: false, random: seeded(3) });
    expect([...positions].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("Fisher–Yates parcial: troca a posição i com uma posição em [i, n)", () => {
    // Pedidos esperados: randomBelow(5), randomBelow(4), randomBelow(3).
    const random = new SequenceRandomSource([4, 0, 2]);
    const outcome = drawPositions(5, 3, { allowRepeat: false, random });
    expect(random.requests).toEqual([5, 4, 3]);
    // [0,1,2,3,4] → troca 0↔4 → [4,1,2,3,0] → troca 1↔1 → troca 2↔4 → [4,1,0,3,2]
    expect(outcome.positions).toEqual([4, 1, 0]);
  });

  it("registra o método e a fonte de aleatoriedade", () => {
    const outcome = drawPositions(3, 1, { allowRepeat: false, random: seeded(9) });
    expect(outcome.algorithm).toBe(`${WITHOUT_REPETITION}+seeded/9`);
    expect(outcome).toMatchObject({ poolSize: 3, quantity: 1, allowRepeat: false });
  });

  it("mesma seed reproduz o resultado; seeds diferentes, não", () => {
    const first = drawPositions(1000, 5, { allowRepeat: false, random: seeded(42) });
    const again = drawPositions(1000, 5, { allowRepeat: false, random: seeded(42) });
    const other = drawPositions(1000, 5, { allowRepeat: false, random: seeded(43) });
    expect(again.positions).toEqual(first.positions);
    expect(other.positions).not.toEqual(first.positions);
  });
});

describe("com repetição", () => {
  it("um participante pode ganhar várias vezes", () => {
    const outcome = drawPositions(1, 3, { allowRepeat: true, random: seeded() });
    expect(outcome.positions).toEqual([0, 0, 0]);
    expect(outcome.algorithm).toBe(`${WITH_REPETITION}+seeded/1`);
  });

  it("aceita quantidade maior que os participantes e a repetição de fato acontece", () => {
    const { positions } = drawPositions(3, 30, { allowRepeat: true, random: seeded(5) });
    expect(positions).toHaveLength(30);
    expect(new Set(positions).size).toBeLessThan(30);
  });
});

describe("fonte de produção (Web Crypto)", () => {
  it("usa crypto.getRandomValues", () => {
    let calls = 0;
    const source = new CryptoRandomSource({
      getRandomValues: <T extends ArrayBufferView | null>(array: T) => {
        calls += 1;
        if (array instanceof Uint32Array) array.fill(7);
        return array;
      },
    });
    expect(source.randomBelow(10)).toBe(7);
    expect(calls).toBe(1);
    expect(source.name).toBe("web-crypto");
  });

  it("descarta valores acima do maior múltiplo (sem viés de módulo)", () => {
    // Para n = 3, 2^32 % 3 = 1: o valor 2^32 − 1 é o único rejeitado.
    const values = [2 ** 32 - 1, 5];
    const source = new CryptoRandomSource({
      getRandomValues: <T extends ArrayBufferView | null>(array: T) => {
        if (array instanceof Uint32Array) {
          array.fill(0);
          array.set(values);
        }
        return array;
      },
    });
    expect(source.randomBelow(3)).toBe(2); // 5 % 3, depois de rejeitar 2^32 − 1
  });

  it("recusa limites inválidos", () => {
    const source = new CryptoRandomSource();
    for (const upper of [0, -1, 1.5, 2 ** 32 + 1]) {
      expect(() => source.randomBelow(upper)).toThrow(RangeError);
    }
  });

  it("resultados reais respeitam os invariantes e são uniformes", () => {
    // Não determinístico, por isso a margem é larga: ±10% em torno de 10 mil ocorrências é mais
    // de 10 desvios-padrão (falso alarme praticamente impossível), mas pega uma fonte quebrada.
    const random = new CryptoRandomSource();
    const counts = new Array<number>(10).fill(0);
    for (let trial = 0; trial < 100_000; trial += 1) {
      const [winner = -1] = drawPositions(10, 1, { allowRepeat: false, random }).positions;
      counts[winner] = (counts[winner] ?? 0) + 1;
    }
    expect(counts.every((count) => count > 9_000 && count < 11_000)).toBe(true);
  });
});

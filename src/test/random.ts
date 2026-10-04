import type { RandomSource } from "~/services/draw";

/** Gerador reprodutível (mulberry32), **somente para testes**: quem escolhe a seed escolhe o resultado. */
export class SeededRandomSource implements RandomSource {
  readonly name: string;
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
    this.name = `seeded/${String(seed)}`;
  }

  randomBelow(upper: number): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const unit = ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
    return Math.floor(unit * upper);
  }
}

/** Devolve os valores dados, em ordem (para testar trocas exatas do algoritmo). */
export class SequenceRandomSource implements RandomSource {
  readonly name = "sequence";
  readonly requests: number[] = [];
  private index = 0;

  constructor(private readonly values: readonly number[]) {}

  randomBelow(upper: number): number {
    this.requests.push(upper);
    const value = this.values[this.index] ?? 0;
    this.index += 1;
    if (value >= upper) throw new Error(`valor ${String(value)} fora de [0, ${String(upper)})`);
    return value;
  }
}

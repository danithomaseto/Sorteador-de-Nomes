/**
 * Motor de sorteio: seleção aleatória pura, sem dependência de interface ou armazenamento.
 *
 * Trabalha com **posições** na lista de candidatos e nunca compara nomes: duas entradas
 * "João Silva" são candidatos distintos (podem ser duas pessoas).
 *
 * - Sem repetição: Fisher–Yates parcial sobre as posições. A cada passo `i`, troca-se a posição
 *   `i` com uma posição uniforme em `[i, n)`. As `k` primeiras formam uma sequência em que cada
 *   uma das `n!/(n-k)!` ordens possíveis tem a mesma probabilidade. Custo O(n + k).
 * - Com repetição: `k` sorteios independentes e uniformes em `[0, n)`.
 *
 * "Remover vencedores entre rodadas" é responsabilidade de quem chama: a rodada seguinte recebe
 * só os candidatos ainda disponíveis.
 */
import type { RandomSource } from "./random";

export const WITHOUT_REPETITION = "partial-fisher-yates/1";
export const WITH_REPETITION = "uniform-with-replacement/1";

export type DrawErrorCode = "invalid_quantity" | "empty_pool" | "insufficient_participants";

export class DrawError extends Error {
  constructor(readonly code: DrawErrorCode) {
    super(code);
    this.name = "DrawError";
  }
}

export interface DrawOptions {
  allowRepeat: boolean;
  random: RandomSource;
}

export interface DrawOutcome {
  /** Posições (a partir de 0) dos vencedores, na ordem do sorteio. */
  readonly positions: readonly number[];
  readonly poolSize: number;
  readonly quantity: number;
  readonly allowRepeat: boolean;
  /** Método e fonte de aleatoriedade, ex.: "partial-fisher-yates/1+web-crypto". */
  readonly algorithm: string;
}

/**
 * Sorteia `quantity` posições em `[0, poolSize)`.
 *
 * @throws {DrawError} quantidade inválida, lista vazia ou (sem repetição) quantidade maior que
 * a lista.
 */
export function drawPositions(
  poolSize: number,
  quantity: number,
  { allowRepeat, random }: DrawOptions,
): DrawOutcome {
  if (!Number.isInteger(quantity) || quantity < 1) throw new DrawError("invalid_quantity");
  if (poolSize < 1) throw new DrawError("empty_pool");

  let positions: number[];
  let method: string;
  if (allowRepeat) {
    positions = Array.from({ length: quantity }, () => random.randomBelow(poolSize));
    method = WITH_REPETITION;
  } else {
    if (quantity > poolSize) throw new DrawError("insufficient_participants");
    positions = partialFisherYates(poolSize, quantity, random);
    method = WITHOUT_REPETITION;
  }
  return { positions, poolSize, quantity, allowRepeat, algorithm: `${method}+${random.name}` };
}

function partialFisherYates(poolSize: number, quantity: number, random: RandomSource): number[] {
  const indices = new Uint32Array(poolSize);
  for (let i = 0; i < poolSize; i += 1) indices[i] = i;
  const chosen: number[] = [];
  for (let i = 0; i < quantity; i += 1) {
    const j = i + random.randomBelow(poolSize - i);
    const picked = indices[j] ?? j;
    indices[j] = indices[i] ?? i;
    indices[i] = picked;
    chosen.push(picked);
  }
  return chosen;
}

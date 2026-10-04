/**
 * Fontes de aleatoriedade do motor de sorteio.
 *
 * Produção usa {@link CryptoRandomSource}: `crypto.getRandomValues`, o gerador de números
 * aleatórios criptograficamente seguro (CSPRNG) do navegador, alimentado pelo sistema
 * operacional. Ele está disponível em todos os navegadores atuais, inclusive fora de HTTPS.
 *
 * Por que não `Math.random()`: a especificação não exige qualidade criptográfica, e os motores
 * usam geradores rápidos (xorshift128+) cujo estado pode ser reconstruído a partir de poucas
 * saídas. Para um sorteio, "imprevisível" importa tanto quanto "bem distribuído".
 *
 * Inteiros em `[0, n)` saem por amostragem por rejeição: valores de 32 bits acima do maior
 * múltiplo de `n` são descartados. Sem isso (`valor % n` direto), os primeiros números do
 * intervalo teriam uma chance ligeiramente maior — o chamado viés de módulo.
 */

const TWO_TO_32 = 2 ** 32;

export interface RandomSource {
  /** Identificador registrado nos metadados de cada rodada. */
  readonly name: string;
  /** Inteiro uniforme em `[0, upper)`; `upper` é um inteiro entre 1 e 2³². */
  randomBelow(upper: number): number;
}

export class CryptoRandomSource implements RandomSource {
  readonly name = "web-crypto";
  // Busca valores em lotes: uma chamada ao gerador atende várias posições do sorteio.
  private readonly batch = new Uint32Array(256);
  private next = this.batch.length;

  constructor(private readonly crypto: Pick<Crypto, "getRandomValues"> = globalThis.crypto) {}

  randomBelow(upper: number): number {
    if (!Number.isInteger(upper) || upper < 1 || upper > TWO_TO_32) {
      throw new RangeError(`Limite inválido para sorteio: ${String(upper)}`);
    }
    // Maior múltiplo de `upper` que cabe em 32 bits: abaixo dele, `valor % upper` é uniforme.
    const accepted = TWO_TO_32 - (TWO_TO_32 % upper);
    for (;;) {
      const value = this.nextUint32();
      if (value < accepted) return value % upper;
    }
  }

  private nextUint32(): number {
    if (this.next === this.batch.length) {
      this.crypto.getRandomValues(this.batch);
      this.next = 0;
    }
    const value = this.batch[this.next] ?? 0;
    this.next += 1;
    return value;
  }
}

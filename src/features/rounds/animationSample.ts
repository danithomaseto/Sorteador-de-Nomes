/**
 * Nomes usados apenas na animação. É uma amostra cosmética, escolhida com Math.random: não tem
 * relação com o sorteio, que já foi feito (com o gerador criptográfico) antes de a animação
 * começar. Assim a animação não depende do tamanho da lista (50 mil nomes = 40 na tela).
 */
export const ANIMATION_SAMPLE_SIZE = 40;
const MIN_FRAMES = 8;

export function animationSample(
  names: readonly string[],
  size = ANIMATION_SAMPLE_SIZE,
  random: () => number = Math.random,
): string[] {
  if (names.length === 0) return [];
  const pool = [...names];
  const count = Math.min(size, pool.length);
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(random() * (pool.length - i));
    const current = pool[i];
    const swap = pool[j];
    if (current !== undefined && swap !== undefined) {
      pool[i] = swap;
      pool[j] = current;
    }
  }
  const sample = pool.slice(0, count);
  // Listas pequenas: repete os nomes para a animação ter quadros suficientes.
  while (sample.length < MIN_FRAMES) sample.push(...sample.slice(0, MIN_FRAMES - sample.length));
  return sample;
}

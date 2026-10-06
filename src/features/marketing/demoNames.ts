/** Nomes fictícios para as demonstrações das páginas de apresentação. */
export const DEMO_NAMES = [
  "Maria Souza",
  "João Silva",
  "Carlos Lima",
  "Paula Reis",
  "Sofia Leal",
  "Bia Torres",
  "Davi Nunes",
  "Lara Costa",
  "Caio Mendes",
  "Enzo Pires",
  "Pedro Alves",
  "Ana Rocha",
  "Luiza Prado",
  "Nina Freire",
  "Igor Matos",
  "Rafael Dias",
  "Beatriz Lopes",
  "Tiago Melo",
  "Rui Barros",
  "Clara Assis",
  "Heitor Campos",
  "Alice Moura",
  "Gael Ramos",
  "Lívia Teles",
  "Otávio Sá",
  "Helena Duarte",
  "Miguel Viana",
  "Júlia Peixoto",
  "Bento Farias",
  "Cecília Rangel",
  "Arthur Bastos",
  "Laura Quintas",
  "Theo Garcia",
  "Manuela Brito",
  "Samuel Rios",
  "Valentina Cruz",
  "Noah Sales",
  "Isadora Lins",
  "Lucas Paiva",
  "Marina Coelho",
  "Gustavo Neri",
  "Yasmin Prata",
  "Felipe Aguiar",
  "Elisa Fontes",
  "Benício Dantas",
  "Lorena Vidal",
  "Joaquim Faria",
  "Rebeca Mota",
] as const;

export interface DemoReel {
  readonly above: string;
  readonly winners: readonly string[];
  readonly below: string;
}

export type DemoRound = readonly DemoReel[];

/** Rodadas determinísticas (mesmo resultado no HTML pré-renderizado e no navegador). */
export function demoRounds(reels: number, rows: number, rounds: number, start = 0): DemoRound[] {
  let cursor = start;
  const next = () => {
    const name = DEMO_NAMES[cursor % DEMO_NAMES.length] ?? "";
    cursor += 1;
    return name;
  };
  return Array.from({ length: rounds }, () =>
    Array.from({ length: reels }, () => {
      const above = next();
      const winners = Array.from({ length: rows }, next);
      return { above, winners, below: next() };
    }),
  );
}

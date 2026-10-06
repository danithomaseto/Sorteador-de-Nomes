import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoRounds } from "./demoNames";
import { LiveReels } from "./LiveReels";

describe("roletas de demonstração", () => {
  it("o HTML inicial já mostra as roletas paradas nos vencedores da primeira rodada", () => {
    const rounds = demoRounds(5, 2, 3);
    const { container } = render(
      <LiveReels rounds={rounds} meta={(round) => `Rodada ${String(round)} · 10 de 127`} />,
    );
    expect(screen.getByText("Vencedores")).toBeInTheDocument();
    expect(screen.getByText("Rodada 1 · 10 de 127")).toBeInTheDocument();
    expect(container.querySelectorAll("ol")).toHaveLength(5);
    for (const reel of rounds[0] ?? []) {
      for (const winner of reel.winners) expect(screen.getByText(winner)).toBeInTheDocument();
    }
    // Decorativas: fora da árvore de acessibilidade.
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("rodadas de demonstração são sempre as mesmas (pré-renderização = navegador)", () => {
    expect(demoRounds(3, 2, 2, 17)).toEqual(demoRounds(3, 2, 2, 17));
    const [first] = demoRounds(5, 2, 1);
    const names = (first ?? []).flatMap((reel) => [reel.above, ...reel.winners, reel.below]);
    expect(new Set(names).size).toBe(names.length);
  });
});

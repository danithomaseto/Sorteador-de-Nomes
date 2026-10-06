import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ShuffleDemo } from "./ShuffleDemo";

const NAMES = ["Ana", "Bruno", "Carla", "Davi", "Eva", "Fábio", "Gil", "Hana"];

describe("demonstração do método", () => {
  it("começa com os 8 participantes na ordem da lista", () => {
    render(<ShuffleDemo />);
    const group = screen.getByRole("group", { name: "Demonstração do método" });
    expect(within(group).getByText("8 participantes, 3 vencedores.")).toBeInTheDocument();
    const chips = group.querySelectorAll("li");
    expect(Array.from(chips, (chip) => chip.textContent)).toEqual(
      NAMES.map((name, index) => `${String(index + 1)}${name}`),
    );
  });

  it("sorteia 3 vencedores diferentes, com o gerador criptográfico, e anuncia o resultado", async () => {
    const user = userEvent.setup();
    render(<ShuffleDemo />);
    await user.click(screen.getByRole("button", { name: "Sortear de novo" }));
    const status = await screen.findByText(/^Resultado da demonstração: /);
    const winners = status.textContent
      .replace("Resultado da demonstração: ", "")
      .replace(/\.$/, "")
      .split(", ");
    expect(winners).toHaveLength(3);
    expect(new Set(winners).size).toBe(3);
    for (const winner of winners) expect(NAMES).toContain(winner);
    // As três primeiras posições viram 1º, 2º e 3º; os 8 nomes continuam lá, só trocados.
    const chips = Array.from(document.querySelectorAll("li"), (chip) => chip.textContent);
    expect(chips.slice(0, 3)).toEqual(winners.map((name, index) => `${String(index + 1)}º${name}`));
    expect(chips.map((text) => text.replace(/^\d+º?/, "")).sort()).toEqual([...NAMES].sort());
    expect(screen.getByRole("button", { name: "Sortear de novo" })).toBeEnabled();
  });
});

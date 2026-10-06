import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DrawReel } from "./DrawReel";

const SAMPLE = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Heitor"];
const WINNERS = Array.from({ length: 10 }, (_, i) => `Vencedor ${String(i + 1)}`);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("roletas", () => {
  it("vários vencedores: todas as roletas param nos vencedores, na ordem", () => {
    const onDone = vi.fn();
    const { container } = render(<DrawReel names={SAMPLE} winners={WINNERS} onDone={onDone} />);
    // Testes rodam com "reduzir movimento": as roletas já aparecem paradas.
    expect(screen.getByText("Vencedores")).toBeInTheDocument();
    for (const name of WINNERS) expect(screen.getByText(name)).toBeInTheDocument();
    // 10 vencedores numa tela larga: 5 roletas com 2 cada.
    expect(container.querySelectorAll("ol")).toHaveLength(5);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("um vencedor: uma roleta", () => {
    const { container } = render(<DrawReel names={SAMPLE} winners={["Ana"]} onDone={vi.fn()} />);
    expect(container.querySelectorAll("ol")).toHaveLength(1);
    expect(screen.getByText("Vencedor")).toBeInTheDocument();
  });

  it("muitos vencedores: avisa que a lista completa vem em seguida", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Pessoa ${String(i + 1)}`);
    render(<DrawReel names={SAMPLE} winners={many} total={200} onDone={vi.fn()} />);
    expect(
      screen.getByText(/^Na tela, os \d+ primeiros\. A lista completa aparece em seguida\.$/),
    ).toBeInTheDocument();
  });

  it("pular encerra a animação na hora", () => {
    const onDone = vi.fn();
    render(<DrawReel names={SAMPLE} winners={WINNERS} onDone={onDone} />);
    act(() => {
      screen.getByRole("button", { name: "Pular animação", hidden: true }).click();
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("no telão, sem o botão de pular", () => {
    render(<DrawReel names={SAMPLE} winners={WINNERS} skippable={false} onDone={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Pular animação", hidden: true })).toBeNull();
  });
});

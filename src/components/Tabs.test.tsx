import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useId, useState } from "react";
import { describe, expect, it } from "vitest";
import { Tabs, tabPanelProps } from "./Tabs";

type Section = "a" | "b" | "c";

function Example() {
  const id = useId();
  const [value, setValue] = useState<Section>("a");
  return (
    <>
      <Tabs<Section>
        id={id}
        label="Seções"
        value={value}
        onChange={setValue}
        tabs={[
          { value: "a", label: "Participantes", count: "3" },
          { value: "b", label: "Regras" },
          { value: "c", label: "Histórico" },
        ]}
      />
      <div {...tabPanelProps(id, value)}>Painel {value}</div>
    </>
  );
}

describe("abas", () => {
  it("liga cada painel à sua aba e deixa só a ativa na ordem do Tab", () => {
    render(<Example />);
    const active = screen.getByRole("tab", { name: "Participantes 3" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Regras" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel", { name: "Participantes 3" })).toHaveTextContent("Painel a");
  });

  it("setas, Home e End trocam de aba e movem o foco", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("tab", { name: "Participantes 3" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Regras" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Painel b");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Histórico" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Participantes 3" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}{Home}");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Painel a");
  });
});

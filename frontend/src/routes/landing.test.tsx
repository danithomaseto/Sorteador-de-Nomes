import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Landing from "./landing";

describe("Landing", () => {
  it("mostra o nome do produto", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sorteia");
  });
});

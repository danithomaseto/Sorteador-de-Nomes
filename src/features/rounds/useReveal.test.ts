import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReveal } from "./useReveal";

describe("revelação", () => {
  it("compacta: uma animação revela todos", () => {
    const { result } = renderHook(() => useReveal(5, "compact", true));
    expect(result.current).toMatchObject({ revealed: 0, animating: 0, done: false });
    act(() => {
      result.current.onAnimationDone();
    });
    expect(result.current).toMatchObject({ revealed: 5, animating: null, done: true });
  });

  it("um a um: cada vencedor no seu tempo", () => {
    const { result } = renderHook(() => useReveal(3, "sequential", true));
    act(() => {
      result.current.onAnimationDone();
    });
    expect(result.current).toMatchObject({ revealed: 1, animating: null, done: false });
    act(() => {
      result.current.next();
    });
    expect(result.current.animating).toBe(1);
    act(() => {
      result.current.onAnimationDone();
    });
    act(() => {
      result.current.revealAll();
    });
    expect(result.current).toMatchObject({ revealed: 3, done: true });
  });

  it("vindo do histórico, tudo aparece de uma vez", () => {
    const { result } = renderHook(() => useReveal(4, "sequential", false));
    expect(result.current).toMatchObject({ revealed: 4, animating: null, done: true });
  });
});

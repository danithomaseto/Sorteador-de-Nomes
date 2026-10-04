import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  channelIdFromHash,
  isControllerMessage,
  isScreenMessage,
  tabScreenChannelId,
  useScreenController,
  useScreenReceiver,
  type ScreenView,
} from "./screen";

const ready: ScreenView = {
  drawName: "Rifa da festa",
  theme: "dark",
  scene: { phase: "ready", prepared: true },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("telão: canal", () => {
  it("identificador aleatório por aba, lido do endereço do telão", () => {
    const id = tabScreenChannelId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(tabScreenChannelId()).toBe(id);
    expect(channelIdFromHash(`#${id}`)).toBe(id);
    expect(channelIdFromHash("")).toBeNull();
    expect(channelIdFromHash("#../../x")).toBeNull();
  });

  it("ignora mensagens fora do protocolo", () => {
    expect(isControllerMessage({ type: "view", view: ready })).toBe(true);
    expect(isControllerMessage({ type: "view", view: { drawName: 1 } })).toBe(false);
    expect(isControllerMessage({ type: "outra" })).toBe(false);
    expect(isControllerMessage("view")).toBe(false);
    expect(isScreenMessage({ type: "primary" })).toBe(true);
    expect(isScreenMessage(null)).toBe(false);
  });
});

describe("telão: sincronização", () => {
  it("espelha a cena, avança pelo telão e pausa ao sair da apresentação", async () => {
    const onPrimary = vi.fn();
    const controller = renderHook(({ view }) => useScreenController(view, onPrimary), {
      initialProps: { view: ready },
    });
    const screen = renderHook(() => useScreenReceiver(tabScreenChannelId()));
    expect(screen.result.current.status).toBe("waiting");

    await waitFor(() => {
      expect(screen.result.current.status).toBe("live");
    });
    expect(screen.result.current.view).toEqual(ready);
    await waitFor(() => {
      expect(controller.result.current.connected).toBe(true);
    });

    const result: ScreenView = {
      ...ready,
      theme: "light",
      scene: { phase: "single", heading: "Parabéns!", name: "Ana" },
    };
    controller.rerender({ view: result });
    await waitFor(() => {
      expect(screen.result.current.view).toEqual(result);
    });

    act(() => {
      screen.result.current.sendPrimary();
    });
    await waitFor(() => {
      expect(onPrimary).toHaveBeenCalledTimes(1);
    });

    controller.unmount();
    await waitFor(() => {
      expect(screen.result.current.status).toBe("paused");
    });
    // A plateia continua vendo o nome do sorteio.
    expect(screen.result.current.view?.drawName).toBe("Rifa da festa");
    screen.unmount();
  });

  it("o modo apresentação percebe quando o telão fecha", async () => {
    const controller = renderHook(() => useScreenController(ready, null));
    const screen = renderHook(() => useScreenReceiver(tabScreenChannelId()));
    await waitFor(() => {
      expect(controller.result.current.connected).toBe(true);
    });
    screen.unmount();
    await waitFor(() => {
      expect(controller.result.current.connected).toBe(false);
    });
    controller.unmount();
  });

  it("um telão já aberto se reconecta quando a apresentação volta", async () => {
    const screen = renderHook(() => useScreenReceiver(tabScreenChannelId()));
    const controller = renderHook(() => useScreenController(ready, null));
    await waitFor(() => {
      expect(controller.result.current.connected).toBe(true);
    });
    expect(screen.result.current.status).toBe("live");
    controller.unmount();
    screen.unmount();
  });

  it("sem identificador válido, o telão não se conecta", () => {
    const { result } = renderHook(() => useScreenReceiver(null));
    expect(result.current.status).toBe("invalid");
  });

  it("abre a janela do telão e avisa quando o navegador bloqueia", () => {
    const open = vi.spyOn(window, "open").mockReturnValueOnce(null);
    const { result, unmount } = renderHook(() => useScreenController(ready, null));
    expect(result.current.supported).toBe(true);
    expect(result.current.open()).toBe(false);
    const id = tabScreenChannelId();
    expect(open).toHaveBeenCalledWith(
      `/sorteio/telao#${id}`,
      `sorteia-telao-${id}`,
      "popup,width=1280,height=720",
    );
    unmount();
  });
});

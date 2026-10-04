/**
 * Telão: uma segunda janela do site (para levar ao projetor) que espelha o palco do modo
 * apresentação. A sincronização usa BroadcastChannel, que troca mensagens entre janelas do mesmo
 * site no mesmo navegador: não passa pela rede e não grava nada. Cada aba usa um canal com
 * identificador aleatório, para que sorteios em abas diferentes não se misturem.
 *
 * Mensagens do modo apresentação: `view` (a cena atual), `probe` (há um telão aberto?), `paused`
 * (saiu do modo apresentação) e `closed` (a janela do sorteio foi fechada).
 * Mensagens do telão: `hello` (pede a cena), `bye` (fechou) e `primary` (Espaço pressionado no
 * telão: avança o sorteio como se fosse no modo apresentação).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { StageScene } from "./scene";

export interface ScreenView {
  readonly drawName: string;
  readonly theme: "dark" | "light";
  readonly scene: StageScene;
}

export type ControllerMessage =
  | { readonly type: "view"; readonly view: ScreenView }
  | { readonly type: "probe" | "paused" | "closed" };

export interface ScreenMessage {
  readonly type: "hello" | "bye" | "primary";
}

export const SCREEN_PATH = "/sorteio/telao";
const CHANNEL_PREFIX = "sorteia-telao:";
const ID_PATTERN = /^[0-9a-f]{16}$/;

export function screenSupported(): boolean {
  return typeof BroadcastChannel === "function" && typeof window.open === "function";
}

function newChannelId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Um canal por aba, só em memória: sair e voltar ao modo apresentação reencontra o telão aberto.
let tabChannelId: string | null = null;

export function tabScreenChannelId(): string {
  tabChannelId ??= newChannelId();
  return tabChannelId;
}

export function channelIdFromHash(hash: string): string | null {
  const id = hash.replace(/^#/, "");
  return ID_PATTERN.test(id) ? id : null;
}

function openChannel(id: string): BroadcastChannel {
  return new BroadcastChannel(CHANNEL_PREFIX + id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isScreenView(value: unknown): value is ScreenView {
  return (
    isRecord(value) &&
    typeof value.drawName === "string" &&
    (value.theme === "dark" || value.theme === "light") &&
    isRecord(value.scene) &&
    typeof value.scene.phase === "string"
  );
}

export function isControllerMessage(data: unknown): data is ControllerMessage {
  if (!isRecord(data)) return false;
  if (data.type === "view") return isScreenView(data.view);
  return data.type === "probe" || data.type === "paused" || data.type === "closed";
}

export function isScreenMessage(data: unknown): data is ScreenMessage {
  return (
    isRecord(data) && (data.type === "hello" || data.type === "bye" || data.type === "primary")
  );
}

export interface ScreenController {
  readonly supported: boolean;
  readonly connected: boolean;
  /** Abre o telão (ou traz para a frente, se já aberto). Falso se o navegador bloquear a janela. */
  open: () => boolean;
}

/** Lado do modo apresentação: publica a cena a cada mudança e atende os pedidos do telão. */
export function useScreenController(
  view: ScreenView,
  onPrimary: (() => void) | null,
): ScreenController {
  const [id] = useState(tabScreenChannelId);
  const [supported] = useState(screenSupported);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const viewRef = useRef(view);
  const primaryRef = useRef(onPrimary);

  useEffect(() => {
    primaryRef.current = onPrimary;
  }, [onPrimary]);

  useEffect(() => {
    if (!supported) return undefined;
    const channel = openChannel(id);
    channelRef.current = channel;
    const post = (message: ControllerMessage) => {
      channel.postMessage(message);
    };
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (!isScreenMessage(event.data)) return;
      if (event.data.type === "hello") {
        setConnected(true);
        post({ type: "view", view: viewRef.current });
      } else if (event.data.type === "bye") {
        setConnected(false);
      } else {
        primaryRef.current?.();
      }
    };
    // Um telão aberto antes, nesta aba, responde com "hello".
    post({ type: "probe" });
    const onPageHide = () => {
      post({ type: "closed" });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      post({ type: "paused" });
      channel.close();
      channelRef.current = null;
    };
  }, [id, supported]);

  useEffect(() => {
    viewRef.current = view;
    channelRef.current?.postMessage({ type: "view", view } satisfies ControllerMessage);
  }, [view]);

  const open = useCallback(() => {
    // Nome por canal: reabrir traz a mesma janela para a frente, sem recarregá-la.
    const handle = window.open(
      `${SCREEN_PATH}#${id}`,
      `sorteia-telao-${id}`,
      "popup,width=1280,height=720",
    );
    if (!handle) return false;
    handle.focus();
    return true;
  }, [id]);

  return { supported, connected, open };
}

export type ScreenStatus = "invalid" | "waiting" | "live" | "paused" | "closed";

interface ScreenReceiverState {
  readonly status: ScreenStatus;
  /** Última cena recebida (mantida quando a apresentação pausa ou fecha). */
  readonly view: ScreenView | null;
}

/** Lado do telão: recebe as cenas do modo apresentação da aba que o abriu. */
export function useScreenReceiver(id: string | null) {
  const [usable] = useState(() => id !== null && screenSupported());
  const [state, setState] = useState<ScreenReceiverState>({
    status: usable ? "waiting" : "invalid",
    view: null,
  });
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!usable || id === null) return undefined;
    const channel = openChannel(id);
    channelRef.current = channel;
    const post = (message: ScreenMessage) => {
      channel.postMessage(message);
    };
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data;
      if (!isControllerMessage(message)) return;
      if (message.type === "view") setState({ status: "live", view: message.view });
      else if (message.type === "probe") post({ type: "hello" });
      else {
        const status = message.type;
        setState((current) => ({ status, view: current.view }));
      }
    };
    post({ type: "hello" });
    const onPageHide = () => {
      post({ type: "bye" });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      post({ type: "bye" });
      channel.close();
      channelRef.current = null;
    };
  }, [id, usable]);

  const sendPrimary = useCallback(() => {
    channelRef.current?.postMessage({ type: "primary" } satisfies ScreenMessage);
  }, []);

  return { ...state, sendPrimary };
}

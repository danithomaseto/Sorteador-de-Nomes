import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "./api/client";

export type AsyncStatus = "idle" | "pending" | "success" | "error";

interface AsyncState<R> {
  status: AsyncStatus;
  data: R | null;
  error: unknown;
}

/**
 * Executa uma chamada assíncrona com estado de carregamento/erro e cancelamento.
 * Uma nova execução cancela a anterior; desmontar o componente cancela a atual.
 */
export function useAsyncAction<Args extends unknown[], R>(
  action: (signal: AbortSignal, ...args: Args) => Promise<R>,
) {
  const [state, setState] = useState<AsyncState<R>>({ status: "idle", data: null, error: null });
  const controller = useRef<AbortController | null>(null);
  const actionRef = useRef(action);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async (...args: Args): Promise<R | undefined> => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState((previous) => ({ ...previous, status: "pending", error: null }));
    try {
      const data = await actionRef.current(current.signal, ...args);
      if (!current.signal.aborted) setState({ status: "success", data, error: null });
      return data;
    } catch (error) {
      if (isAbortError(error) || current.signal.aborted) return undefined;
      setState({ status: "error", data: null, error });
      return undefined;
    }
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    setState((previous) =>
      previous.status === "pending" ? { ...previous, status: "idle" } : previous,
    );
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", data: null, error: null });
  }, []);

  return { ...state, run, cancel, reset, pending: state.status === "pending" };
}

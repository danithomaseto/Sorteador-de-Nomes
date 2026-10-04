/**
 * Importação vista pela interface: envia o trabalho ao Web Worker e devolve a pré-visualização.
 *
 * Sem suporte a Worker (ambiente de testes), o mesmo código roda na thread principal. Leituras
 * canceladas ou que passam do tempo limite encerram o Worker, liberando a CPU na hora.
 */
import { LIMITS } from "~/config";
import { importFailure, type ImportFailure } from "./errors";
import type { ImportRequest, ImportResponse } from "./handler";
import type { FileFormat, FileImportOptions, ImportPreview, TextImportOptions } from "./types";

const TIMEOUT_MS = 60_000;

export class ImportFailedError extends Error {
  constructor(readonly failure: ImportFailure) {
    super(failure.code);
    this.name = "ImportFailedError";
  }
}

type RequestBody = ImportRequest extends infer Request
  ? Request extends ImportRequest
    ? Omit<Request, "id">
    : never
  : never;

interface Pending {
  resolve: (preview: ImportPreview) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function settle(response: ImportResponse): void {
  const request = pending.get(response.id);
  if (!request) return;
  pending.delete(response.id);
  clearTimeout(request.timer);
  if (response.ok) request.resolve(response.preview);
  else request.reject(new ImportFailedError(response.failure));
}

function stopWorker(reason: ImportFailure | null): void {
  worker?.terminate();
  worker = null;
  for (const [id, request] of pending) {
    clearTimeout(request.timer);
    if (reason) request.reject(new ImportFailedError(reason));
    pending.delete(id);
  }
}

function startWorker(): Worker {
  const instance = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
    name: "importacao",
  });
  instance.addEventListener("message", (event: MessageEvent<ImportResponse>) => {
    settle(event.data);
  });
  instance.addEventListener("error", () => {
    stopWorker(importFailure("import_failed"));
  });
  return instance;
}

async function run(body: RequestBody, signal?: AbortSignal): Promise<ImportPreview> {
  signal?.throwIfAborted();
  if (typeof Worker === "undefined") {
    const { handleImportRequest } = await import("./handler");
    const response = handleImportRequest({ ...body, id: 0 });
    if (!response.ok) throw new ImportFailedError(response.failure);
    return response.preview;
  }
  worker ??= startWorker();
  const instance = worker;
  const id = nextId++;
  return new Promise<ImportPreview>((resolve, reject) => {
    const timer = setTimeout(() => {
      stopWorker(importFailure("import_timeout"));
    }, TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    signal?.addEventListener(
      "abort",
      () => {
        if (!pending.has(id)) return;
        clearTimeout(timer);
        pending.delete(id);
        // Sem outras leituras em andamento, interrompe o trabalho que ficou sem destino.
        if (pending.size === 0) stopWorker(null);
        reject(
          signal.reason instanceof Error
            ? signal.reason
            : new DOMException("Cancelado", "AbortError"),
        );
      },
      { once: true },
    );
    const request: ImportRequest = { ...body, id };
    instance.postMessage(request);
  });
}

export function importText(
  text: string,
  options: TextImportOptions,
  signal?: AbortSignal,
): Promise<ImportPreview> {
  return run({ kind: "text", text, options }, signal);
}

export async function importFile(
  file: File,
  options: Omit<FileImportOptions, "formatHint">,
  signal?: AbortSignal,
): Promise<ImportPreview> {
  // Verificações baratas antes de ler o arquivo para a memória.
  if (file.size === 0) throw new ImportFailedError(importFailure("empty_file"));
  if (file.size > LIMITS.maxFileBytes) throw new ImportFailedError(importFailure("file_too_large"));
  const bytes = await file.arrayBuffer();
  return run(
    { kind: "file", bytes, options: { ...options, formatHint: formatFromFileName(file.name) } },
    signal,
  );
}

/** Formato sugerido pela extensão; o conteúdo do arquivo é que decide (ver `parse.ts`). */
export function formatFromFileName(name: string): FileFormat | null {
  const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return extension === "xlsx" || extension === "xls" || extension === "csv" ? extension : null;
}

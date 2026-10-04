import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];
export type ImportPreview = Schemas["ImportPreviewOut"];
export type ImportTextRequest = Schemas["ImportTextRequest"];
export type RoundRequest = Schemas["RoundRequest"];
export type RoundResult = Schemas["RoundOut"];
export type Limits = Schemas["LimitsOut"];
export type ExportRequest = Schemas["ExportRequest"];
export type ExportFormat = "csv" | "xlsx";
export type FileImportQuery = NonNullable<
  paths["/api/v1/imports/file"]["post"]["parameters"]["query"]
>;

/** Erro da API já normalizado: `code` estável (RFC 9457) ou `network_error`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly params: Readonly<Record<string, number | string>> = {},
    readonly detail: string | null = null,
    readonly requestId: string | null = null,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

// Mesma origem (ADR-008): sem CORS. A origem da página vira URL absoluta (exigida fora do navegador).
const client = createClient<paths>({
  baseUrl: typeof window === "undefined" ? "" : window.location.origin,
  // O fetch global é lido a cada chamada, não na importação do módulo: assim ele pode ser
  // interceptado depois (os testes de componente simulam a API dessa forma).
  fetch: (request) => globalThis.fetch(request),
});

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function toApiError(status: number, body: unknown): ApiError {
  if (typeof body === "object" && body !== null && "code" in body) {
    const problem = body as {
      code?: unknown;
      params?: unknown;
      detail?: unknown;
      request_id?: unknown;
    };
    return new ApiError(
      status,
      typeof problem.code === "string" ? problem.code : "http_error",
      typeof problem.params === "object" && problem.params !== null
        ? (problem.params as Record<string, number | string>)
        : {},
      typeof problem.detail === "string" ? problem.detail : null,
      typeof problem.request_id === "string" ? problem.request_id : null,
    );
  }
  return new ApiError(status, status >= 500 ? "internal_error" : "http_error");
}

async function call<T>(request: () => Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await request();
  } catch (cause) {
    if (isAbortError(cause)) throw cause;
    throw new ApiError(0, "network_error");
  }
  if (!result.response.ok || result.data === undefined) {
    throw toApiError(result.response.status, result.error);
  }
  return result.data;
}

export const api = {
  limits(signal?: AbortSignal): Promise<Limits> {
    return call(() => client.GET("/api/v1/limits", { signal }));
  },

  importText(body: ImportTextRequest, signal?: AbortSignal): Promise<ImportPreview> {
    return call(() => client.POST("/api/v1/imports/text", { body, signal }));
  },

  /** O arquivo vai como corpo bruto e só existe na memória da aba e da requisição. */
  importFile(file: Blob, query: FileImportQuery, signal?: AbortSignal): Promise<ImportPreview> {
    return call(() =>
      client.POST("/api/v1/imports/file", {
        params: { query },
        body: file as unknown as string,
        bodySerializer: (body: unknown) => body as BodyInit,
        headers: { "Content-Type": "application/octet-stream" },
        signal,
      }),
    );
  },

  createRound(body: RoundRequest, signal?: AbortSignal): Promise<RoundResult> {
    return call(() => client.POST("/api/v1/rounds", { body, signal }));
  },

  exportFile(format: ExportFormat, body: ExportRequest, signal?: AbortSignal): Promise<Blob> {
    return call(() =>
      client.POST("/api/v1/exports", {
        params: { query: { format } },
        body,
        parseAs: "blob",
        signal,
      }),
    );
  },
};

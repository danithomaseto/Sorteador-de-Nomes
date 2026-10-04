/** Protocolo entre a interface e o Web Worker de importação (mensagens serializáveis). */
import { ImportError, importFailure, type ImportFailure } from "./errors";
import { previewFile, previewText } from "./parse";
import type { FileImportOptions, ImportPreview, TextImportOptions } from "./types";

export type ImportRequest =
  | {
      readonly id: number;
      readonly kind: "text";
      readonly text: string;
      readonly options: TextImportOptions;
    }
  | {
      readonly id: number;
      readonly kind: "file";
      readonly bytes: ArrayBuffer;
      readonly options: FileImportOptions;
    };

export type ImportResponse =
  | { readonly id: number; readonly ok: true; readonly preview: ImportPreview }
  | { readonly id: number; readonly ok: false; readonly failure: ImportFailure };

export function handleImportRequest(request: ImportRequest): ImportResponse {
  try {
    const preview =
      request.kind === "text"
        ? previewText(request.text, request.options)
        : previewFile(new Uint8Array(request.bytes), request.options);
    return { id: request.id, ok: true, preview };
  } catch (error) {
    // Fronteira com conteúdo não confiável: qualquer falha inesperada vira mensagem amigável.
    const failure = error instanceof ImportError ? error.failure : importFailure("import_failed");
    return { id: request.id, ok: false, failure };
  }
}

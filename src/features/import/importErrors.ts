import { importFailure, ImportFailedError } from "~/services/import";

/** Título e mensagem para mostrar quando uma importação falha. */
export function importErrorMessage(error: unknown): { title: string; message: string } {
  const failure =
    error instanceof ImportFailedError ? error.failure : importFailure("import_failed");
  return { title: failure.title, message: failure.message };
}

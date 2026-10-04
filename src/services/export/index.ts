/** Exportação do resultado: gerada no navegador e entregue como download. Nada é enviado. */
import { writeCsv } from "./csv";
import { exportFileName, type ExportDocument, type ExportFormat } from "./document";
import { writeTxt } from "./txt";
import { writeXlsx } from "./xlsx";

export { renderResultImage } from "./image";
export {
  describeAlgorithm,
  exportFileName,
  ordinal,
  type ExportDocument,
  type ExportFormat,
  type ExportRound,
} from "./document";

const MIME_TYPES: Record<ExportFormat, string> = {
  txt: "text/plain;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export interface ExportFile {
  readonly blob: Blob;
  readonly fileName: string;
}

export function createExport(document: ExportDocument, format: ExportFormat): ExportFile {
  let content: string | Uint8Array<ArrayBuffer>;
  if (format === "xlsx") content = new Uint8Array(writeXlsx(document));
  else content = format === "csv" ? writeCsv(document) : writeTxt(document);
  return {
    blob: new Blob([content], { type: MIME_TYPES[format] }),
    fileName: exportFileName(document, format),
  };
}

/** Entrega o arquivo ao usuário sem guardar nada: o link temporário é revogado em seguida. */
export function downloadFile({ blob, fileName }: ExportFile): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

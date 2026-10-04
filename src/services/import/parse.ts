/**
 * Importação: transforma texto, CSV, XLSX e XLS em participantes válidos.
 *
 * Tudo acontece na memória do navegador: o arquivo nunca é enviado a lugar nenhum. O resultado é
 * uma pré-visualização que a pessoa revisa e confirma antes de adicionar à lista.
 */
import { LIMITS } from "~/config";
import { isCompoundFile } from "./cfb";
import { decodeText, detectDelimiter, parseDelimited } from "./delimited";
import { ImportError, UnsupportedFormatError } from "./errors";
import { previewItems, previewTable } from "./preview";
import { looksTabular, resolveSeparator, splitText } from "./text";
import type { FileFormat, FileImportOptions, ImportPreview, TextImportOptions } from "./types";
import { readXls } from "./xls";
import { readXlsx } from "./xlsx";

const startsWith = (bytes: Uint8Array, signature: readonly number[]) =>
  signature.every((byte, index) => bytes[index] === byte);

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const EMPTY_ZIP = [0x50, 0x4b, 0x05, 0x06];
// Formatos que costumam chegar por engano recebem uma explicação própria.
const OTHER_FORMATS: readonly (readonly [readonly number[], string])[] = [
  [[0x25, 0x50, 0x44, 0x46, 0x2d], "Este arquivo é um PDF."],
  [[0x89, 0x50, 0x4e, 0x47], "Este arquivo é uma imagem."],
  [[0xff, 0xd8, 0xff], "Este arquivo é uma imagem."],
  [[0x47, 0x49, 0x46, 0x38], "Este arquivo é uma imagem."],
  [[0x52, 0x61, 0x72, 0x21], "Este arquivo é compactado (.rar)."],
  [[0x37, 0x7a, 0xbc, 0xaf], "Este arquivo é compactado (.7z)."],
];

export function previewText(text: string, options: TextImportOptions): ImportPreview {
  if (text.length > LIMITS.maxTextChars) throw new ImportError("text_too_long");
  if (options.separator === "auto" && looksTabular(text)) {
    const table = previewTable(parseDelimited(text, "tab"), "text", options);
    return { ...table, separator: "tab" };
  }
  const separator = resolveSeparator(text, options.separator);
  const items = splitText(text, separator);
  if (items.filter(([, value]) => value.trim()).length > LIMITS.maxParticipants) {
    throw new ImportError("too_many_rows");
  }
  return previewItems(items, separator);
}

export function previewFile(bytes: Uint8Array, options: FileImportOptions): ImportPreview {
  if (bytes.length === 0) throw new ImportError("empty_file");
  if (bytes.length > LIMITS.maxFileBytes) throw new ImportError("file_too_large");

  const format = detectFormat(bytes, options.formatHint);
  if (format === "xlsx" || format === "xls") {
    const workbook =
      format === "xlsx" ? readXlsx(bytes, options.sheet) : readXls(bytes, options.sheet);
    const table = previewTable(workbook.rows, format, options);
    return { ...table, sheets: workbook.sheets, sheet: workbook.selected };
  }
  const text = decodeText(bytes);
  const delimiter = options.delimiter === "auto" ? detectDelimiter(text) : options.delimiter;
  const table = previewTable(parseDelimited(text, delimiter), "csv", options);
  return { ...table, separator: delimiter };
}

/** O conteúdo decide o formato; a extensão do arquivo é só uma pista. */
export function detectFormat(bytes: Uint8Array, hint: FileFormat | null): FileFormat {
  if (startsWith(bytes, ZIP) || startsWith(bytes, EMPTY_ZIP)) return "xlsx";
  if (isCompoundFile(bytes)) return "xls";
  for (const [signature, detail] of OTHER_FORMATS) {
    if (startsWith(bytes, signature)) throw new UnsupportedFormatError(detail);
  }
  if (hint === "xlsx" || hint === "xls") throw new ImportError("invalid_spreadsheet");
  return "csv";
}

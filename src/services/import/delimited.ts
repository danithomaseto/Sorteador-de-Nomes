/** Texto delimitado: CSV, TSV e colunas coladas de uma planilha. */
import { LIMITS } from "~/config";
import { textCell } from "./cells";
import { ImportError } from "./errors";
import { splitLines } from "./lines";
import type { Row } from "./types";

export type DelimiterName = "semicolon" | "comma" | "tab" | "none";

const DELIMITERS: Record<Exclude<DelimiterName, "none">, string> = {
  semicolon: ";",
  comma: ",",
  tab: "\t",
};
// Ordem de preferência: ";" é o padrão do Excel em português (a vírgula é o separador decimal).
const DETECTION_ORDER = ["semicolon", "tab", "comma"] as const;
const SAMPLE_LINES = 50;
const CONSISTENCY = 0.8;
// Campo com mais caracteres que isso indica um arquivo que não é uma lista (mesmo limite do
// módulo csv do Python).
const MAX_FIELD_LENGTH = 131_072;

const QUOTE = 34;
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;

/** Decodifica UTF-8 (com ou sem BOM), UTF-16 com BOM ou Windows-1252. */
export function decodeText(bytes: Uint8Array): string {
  try {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(3));
    }
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2));
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder("utf-16be", { fatal: true }).decode(bytes.subarray(2));
    }
  } catch {
    throw new ImportError("invalid_text_file");
  }
  if (bytes.includes(0)) throw new ImportError("invalid_text_file"); // conteúdo binário
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Exportações do Excel no Windows costumam usar Windows-1252.
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Escolhe o delimitador que produz o mesmo número de colunas (> 1) na maioria das linhas. */
export function detectDelimiter(text: string): DelimiterName {
  const sample = splitLines(text)
    .filter((line) => line.trim())
    .slice(0, SAMPLE_LINES);
  if (sample.length === 0) return "none";
  for (const name of DETECTION_ORDER) {
    let widths: number[];
    try {
      widths = parseRecords(sample.join("\n"), DELIMITERS[name]).map((record) => record.length);
    } catch {
      continue;
    }
    const [width, occurrences] = mostCommon(widths);
    if (width > 1 && occurrences / widths.length >= CONSISTENCY) return name;
  }
  return "none";
}

/** Linhas do arquivo como células; índice + 1 = número da linha. */
export function parseDelimited(text: string, delimiter: DelimiterName): Row[] {
  let records: string[][];
  if (delimiter === "none") {
    records = splitLines(text).map((line) => [line]);
  } else {
    try {
      records = parseRecords(text, DELIMITERS[delimiter]);
    } catch {
      throw new ImportError("invalid_text_file");
    }
  }
  let filled = 0;
  const rows = records.map((record) => {
    const row = record.slice(0, LIMITS.maxColumns).map(textCell);
    if (row.some((cell) => cell.kind !== "empty")) filled += 1;
    return row;
  });
  // +1: a primeira linha pode ser cabeçalho.
  if (filled > LIMITS.maxParticipants + 1) throw new ImportError("too_many_rows");
  return rows;
}

/**
 * Leitor CSV no estilo do Excel (RFC 4180, tolerante): aspas só abrem um campo no início dele,
 * aspas duplicadas dentro de um campo entre aspas viram uma aspa, e campos entre aspas podem
 * conter o delimitador e quebras de linha.
 */
function parseRecords(text: string, delimiter: string): string[][] {
  const separator = delimiter.charCodeAt(0);
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  // Algum caractere (ou aspa) já pertence ao campo atual: aspas no meio do campo são literais.
  let consumed = false;
  // Houve um delimitador: existe um campo, talvez vazio, a fechar ("a;" tem dois campos).
  let pendingField = false;
  let index = 0;
  const length = text.length;

  const endField = () => {
    if (field.length > MAX_FIELD_LENGTH) throw new Error("campo longo demais");
    record.push(field);
    field = "";
    consumed = false;
  };
  const endRecord = () => {
    if (consumed || pendingField) endField();
    records.push(record);
    record = [];
    pendingField = false;
  };

  while (index < length) {
    const code = text.charCodeAt(index);
    if (quoted) {
      if (code === QUOTE) {
        if (text.charCodeAt(index + 1) === QUOTE) {
          field += '"';
          index += 2;
        } else {
          quoted = false;
          index += 1;
        }
        continue;
      }
      // Copia de uma vez o trecho até a próxima aspa (pode incluir delimitadores e quebras).
      const nextQuote = text.indexOf('"', index);
      const end = nextQuote === -1 ? length : nextQuote;
      field += text.slice(index, end);
      if (field.length > MAX_FIELD_LENGTH) throw new Error("campo longo demais");
      index = end;
      continue;
    }
    if (code === separator) {
      endField();
      pendingField = true;
      index += 1;
      continue;
    }
    if (code === LINE_FEED || code === CARRIAGE_RETURN) {
      endRecord();
      index += code === CARRIAGE_RETURN && text.charCodeAt(index + 1) === LINE_FEED ? 2 : 1;
      continue;
    }
    if (code === QUOTE && !consumed) {
      quoted = true;
      consumed = true;
      index += 1;
      continue;
    }
    // Trecho comum do campo, até o próximo delimitador ou quebra de linha.
    let end = index + 1;
    while (end < length) {
      const next = text.charCodeAt(end);
      if (next === separator || next === LINE_FEED || next === CARRIAGE_RETURN) break;
      end += 1;
    }
    field += text.slice(index, end);
    consumed = true;
    index = end;
  }
  if (consumed || pendingField) endRecord();
  return records;
}

function mostCommon(values: readonly number[]): [value: number, occurrences: number] {
  const counts = new Map<number, number>();
  let best: [number, number] = [0, 0];
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > best[1]) best = [value, count];
  }
  return best;
}

/**
 * Conversão de valores de planilha em texto, preservando o que é útil para o usuário.
 *
 * Números viram texto sem ".0" (bilhetes numerados são participantes válidos); datas viram
 * dd/mm/aaaa e são sinalizadas, porque quase sempre indicam que a coluna escolhida não é a de
 * nomes.
 */
import type { Cell } from "./types";

export const EMPTY_CELL: Cell = { text: "", kind: "empty" };

export const EXCEL_ERRORS: ReadonlySet<string> = new Set([
  "#NULL!",
  "#DIV/0!",
  "#VALUE!",
  "#REF!",
  "#NAME?",
  "#NUM!",
  "#N/A",
  "#GETTING_DATA",
  "#SPILL!",
  "#CALC!",
  "#FIELD!",
  "#BLOCKED!",
  "#CONNECT!",
  "#BUSY!",
  "#UNKNOWN!",
]);

const NUMERIC_TEXT = /^[+-]?\d+(?:[.,]\d+)*$/;
const LETTER = /\p{L}/u;
const MS_PER_DAY = 86_400_000;
const EPOCH_1900 = Date.UTC(1899, 11, 30);
const EPOCH_1904 = Date.UTC(1904, 0, 1);

export function textCell(value: string): Cell {
  const stripped = value.trim();
  if (!stripped) return EMPTY_CELL;
  if (EXCEL_ERRORS.has(stripped)) return { text: stripped, kind: "error" };
  if (NUMERIC_TEXT.test(stripped)) return { text: value, kind: "number" };
  return { text: value, kind: "text" };
}

export function numberCell(value: number): Cell {
  if (!Number.isFinite(value)) return EMPTY_CELL;
  return { text: String(value), kind: "number" };
}

export function booleanCell(value: boolean): Cell {
  return { text: value ? "Verdadeiro" : "Falso", kind: "text" };
}

export function errorCell(code: string): Cell {
  return { text: code, kind: "error" };
}

/** Número de série de data do Excel (dias desde 1900 ou 1904) em texto dd/mm/aaaa [hh:mm]. */
export function serialDateCell(serial: number, date1904: boolean): Cell {
  if (!Number.isFinite(serial) || serial < 0 || serial > 2_958_465) return numberCell(serial);
  const seconds = Math.round(serial * 86_400);
  const moment = new Date((date1904 ? EPOCH_1904 : EPOCH_1900) + seconds * 1000);
  const time = `${pad(moment.getUTCHours())}:${pad(moment.getUTCMinutes())}`;
  // Valores menores que 1 dia são só horário (ex.: 18:35).
  if (serial < 1 && !date1904) return { text: time, kind: "date" };
  const date = `${pad(moment.getUTCDate())}/${pad(moment.getUTCMonth() + 1)}/${String(moment.getUTCFullYear())}`;
  const hasTime = seconds % 86_400 !== 0;
  return { text: hasTime ? `${date} ${time}` : date, kind: "date" };
}

/** Data ISO 8601 (células `t="d"` do XLSX). */
export function isoDateCell(value: string): Cell {
  const moment = Date.parse(value.endsWith("Z") || value.includes("+") ? value : `${value}Z`);
  if (Number.isNaN(moment)) return textCell(value);
  return serialDateCell((moment - EPOCH_1900) / MS_PER_DAY, false);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Texto com pelo menos uma letra: o tipo de valor esperado numa coluna de nomes. */
export function isNameLike(cell: Cell | undefined): boolean {
  return cell?.kind === "text" && LETTER.test(cell.text);
}

export function hasContent(cell: Cell | undefined): boolean {
  return cell !== undefined && cell.kind !== "empty";
}

// Formatos de número embutidos do Excel que representam datas ou horários.
const BUILT_IN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51,
  52, 53, 54, 55, 56, 57, 58,
]);

/** O formato de número (embutido ou personalizado) mostra uma data ou um horário? */
export function isDateFormat(
  formatId: number,
  customFormats: ReadonlyMap<number, string>,
): boolean {
  const code = customFormats.get(formatId);
  if (code === undefined) return BUILT_IN_DATE_FORMATS.has(formatId);
  const firstSection = code
    .replace(/"[^"]*"/g, "") // textos literais
    .replace(/\\./g, "") // caracteres escapados
    .replace(/[_*]./g, "") // espaçamento e preenchimento
    .replace(/\[[^\]]*\]/g, (bracket) => (/^\[(?:h+|m+|s+)\]$/i.test(bracket) ? "h" : ""))
    .split(";")[0];
  return /[dmyhs]/i.test(firstSection ?? "");
}

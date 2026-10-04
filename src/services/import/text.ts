/** Texto colado ou digitado: uma pessoa por linha, ou separadas por ponto e vírgula ou vírgula. */
import { splitLines } from "./lines";
import type { SeparatorOption } from "./types";

export type TextSeparator = "newline" | "semicolon" | "comma";

const TAB_SHARE = 0.5;

/**
 * Detecção automática: mais de uma linha com conteúdo → uma pessoa por linha (assim
 * "Silva, João" não é quebrado); senão ponto e vírgula; senão vírgula.
 */
export function resolveSeparator(text: string, option: SeparatorOption): TextSeparator {
  if (option !== "auto") return option;
  const filledLines = splitLines(text).filter((line) => line.trim()).length;
  if (filledLines >= 2) return "newline";
  if (text.includes(";")) return "semicolon";
  if (text.includes(",")) return "comma";
  return "newline";
}

/** Colunas coladas de uma planilha chegam separadas por tab. */
export function looksTabular(text: string): boolean {
  const lines = splitLines(text).filter((line) => line.trim());
  if (lines.length === 0) return false;
  const withTab = lines.filter((line) => line.trim().includes("\t")).length;
  return withTab / lines.length >= TAB_SHARE;
}

/** Itens numerados a partir de 1: número da linha (por linha) ou posição do item. */
export function splitText(text: string, separator: TextSeparator): [number, string][] {
  const items =
    separator === "newline"
      ? splitLines(text)
      : text.split(separator === "semicolon" ? /[;\r\n]+/ : /[,\r\n]+/);
  return items.map((item, index) => [index + 1, item]);
}

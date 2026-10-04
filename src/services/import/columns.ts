/**
 * Detecção de cabeçalho e da coluna com os nomes.
 *
 * A detecção é só uma sugestão: a interface sempre mostra a coluna escolhida e deixa trocar.
 */
import { matchKey, normalizeName } from "~/services/names";
import { hasContent, isNameLike } from "./cells";
import type { Cell, ColumnInfo, Row } from "./types";

const HEADER_WORDS = new Set([
  "nome",
  "nomes",
  "name",
  "names",
  "participante",
  "participantes",
  "participant",
  "participants",
  "aluno",
  "alunos",
  "aluna",
  "alunas",
  "estudante",
  "estudantes",
  "colaborador",
  "colaboradores",
  "colaboradora",
  "colaboradoras",
  "funcionario",
  "funcionarios",
  "funcionaria",
  "funcionarias",
  "cliente",
  "clientes",
  "inscrito",
  "inscritos",
  "inscrita",
  "inscritas",
  "convidado",
  "convidados",
  "convidada",
  "convidadas",
  "pessoa",
  "pessoas",
  "membro",
  "membros",
  "jogador",
  "jogadores",
  "responsavel",
]);
const PREFERRED_HEADERS = ["nome completo", "nome", "name", "full name"];
const NUMERIC_SHARE = 0.8;
const SAMPLES = 3;
const LABEL_LENGTH = 60;

/** 0 → A, 25 → Z, 26 → AA (como no Excel). */
export function columnLetter(index: number): string {
  let letters = "";
  let number = index + 1;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    number = Math.floor((number - 1) / 26);
  }
  return letters;
}

function headerKey(cell: Cell | undefined): string {
  return cell ? matchKey(normalizeName(cell.text)) : "";
}

export function isHeaderLabel(cell: Cell | undefined): boolean {
  if (cell?.kind !== "text") return false;
  const key = headerKey(cell);
  return HEADER_WORDS.has(key) || /^(?:nome|name|nomes) /.test(key);
}

/**
 * Há cabeçalho se a primeira linha tem um rótulo conhecido ("Nome", "Aluno"…) ou se ela é texto
 * sobre uma coluna que, abaixo, é quase toda numérica (ex.: "Matrícula" sobre números).
 */
export function detectHeader(rows: readonly Row[], first: number): boolean {
  const header = rows[first] ?? [];
  if (header.some(isHeaderLabel)) return true;
  const body = rows.slice(first + 1);
  return header.some((cell, index) => {
    if (!isNameLike(cell)) return false;
    let filled = 0;
    let numeric = 0;
    for (const row of body) {
      const below = row[index];
      if (!hasContent(below)) continue;
      filled += 1;
      if (below?.kind === "number" || below?.kind === "date") numeric += 1;
    }
    return filled > 0 && numeric / filled >= NUMERIC_SHARE;
  });
}

export function describeColumns(
  rows: readonly Row[],
  headerIndex: number | null,
  dataStart: number,
  width: number,
): ColumnInfo[] {
  return Array.from({ length: width }, (_, index) => {
    const label =
      headerIndex === null
        ? ""
        : normalizeName(rows[headerIndex]?.[index]?.text ?? "").slice(0, LABEL_LENGTH);
    const samples: string[] = [];
    let filled = 0;
    for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
      const cell = rows[rowIndex]?.[index];
      if (!hasContent(cell)) continue;
      filled += 1;
      if (samples.length < SAMPLES) {
        const sample = normalizeName(cell?.text ?? "");
        if (sample) samples.push(sample.slice(0, LABEL_LENGTH));
      }
    }
    const letter = columnLetter(index);
    return { index, letter, label: label || `Coluna ${letter}`, samples, filled };
  });
}

/** Prefere o cabeçalho "Nome" (ou similar); senão a coluna com mais textos com letras. */
export function chooseColumn(
  rows: readonly Row[],
  headerIndex: number | null,
  dataStart: number,
  width: number,
): number {
  if (width === 0) return 0;
  if (headerIndex !== null) {
    const header = (rows[headerIndex] ?? []).slice(0, width);
    const keys = Array.from({ length: width }, (_, index) => headerKey(header[index]));
    for (const preferred of PREFERRED_HEADERS) {
      const index = keys.indexOf(preferred);
      if (index >= 0) return index;
    }
    const labelled = Array.from({ length: width }, (_, index) => header[index]).findIndex(
      isHeaderLabel,
    );
    if (labelled >= 0) return labelled;
  }
  const scores = new Array<number>(width).fill(0);
  for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    for (let index = 0; index < Math.min(width, row.length); index += 1) {
      if (isNameLike(row[index])) scores[index] = (scores[index] ?? 0) + 1;
    }
  }
  // Maior pontuação; em empate, a coluna mais à esquerda.
  return scores.reduce((best, score, index) => (score > (scores[best] ?? 0) ? index : best), 0);
}

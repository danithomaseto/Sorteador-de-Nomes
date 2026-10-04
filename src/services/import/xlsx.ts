/**
 * Leitura de planilhas .xlsx (Office Open XML) no navegador.
 *
 * Proteções, nesta ordem: estrutura do ZIP e tamanhos declarados (ver `zip.ts`); partes
 * obrigatórias do formato (recusa .docx, .ods, .xlsb com mensagens próprias); XML lido sem DTD
 * (ver `xml.ts`); leitura interrompida ao passar do limite de linhas ou depois de muitas linhas
 * vazias seguidas. Fórmulas valem pelo último resultado calculado e salvo no arquivo.
 */
import { LIMITS } from "~/config";
import {
  booleanCell,
  EMPTY_CELL,
  errorCell,
  hasContent,
  isDateFormat,
  isoDateCell,
  numberCell,
  serialDateCell,
  textCell,
} from "./cells";
import { ImportError, UnsupportedFormatError } from "./errors";
import { decodeXml, elements, firstElement, parseAttributes, richText, xmlPatterns } from "./xml";
import { ZipArchive } from "./zip";
import type { Cell, Row, SheetInfo, WorkbookTable } from "./types";

const { PREFIX, TAG_ATTRIBUTES } = xmlPatterns;
const DATA_PROBE_ROWS = 200;
// Tipos de relação do OOXML terminam com o nome da parte (ex.: ".../relationships/worksheet").
const RELATION = {
  officeDocument: "/officeDocument",
  worksheet: "/worksheet",
  sharedStrings: "/sharedStrings",
  styles: "/styles",
} as const;

interface SheetPart extends SheetInfo {
  readonly path: string;
}

interface WorkbookContext {
  readonly archive: ZipArchive;
  readonly sheets: readonly SheetPart[];
  readonly sharedStrings: readonly string[];
  readonly dateStyles: ReadonlySet<number>;
  readonly date1904: boolean;
}

export function readXlsx(bytes: Uint8Array, requestedSheet: number | null): WorkbookTable {
  const archive = new ZipArchive(bytes);
  const context = openWorkbook(archive);
  if (requestedSheet !== null) {
    const sheet = context.sheets[requestedSheet];
    if (!sheet) throw new ImportError("sheet_not_found");
    return { sheets: publicSheets(context), selected: sheet.index, rows: readRows(context, sheet) };
  }
  // Primeira aba (visíveis antes das ocultas) com conteúdo nas primeiras linhas.
  const ordered = [...context.sheets].sort((a, b) => Number(a.hidden) - Number(b.hidden));
  for (const sheet of ordered) {
    const rows = readRows(context, sheet);
    if (rows.slice(0, DATA_PROBE_ROWS).some((row) => row.some(hasContent))) {
      return { sheets: publicSheets(context), selected: sheet.index, rows };
    }
  }
  const first = context.sheets[0];
  if (!first) throw new ImportError("invalid_spreadsheet");
  return { sheets: publicSheets(context), selected: first.index, rows: [] };
}

function publicSheets(context: WorkbookContext): SheetInfo[] {
  return context.sheets.map(({ index, name, hidden }) => ({ index, name, hidden }));
}

function openWorkbook(archive: ZipArchive): WorkbookContext {
  const workbookPath = findWorkbookPath(archive);
  const workbookXml = archive.text(workbookPath);
  if (workbookXml === null) throw new ImportError("invalid_spreadsheet");
  const relations = readRelations(archive, relationsPath(workbookPath));
  const base = workbookPath.slice(0, workbookPath.lastIndexOf("/") + 1);

  const sheets: SheetPart[] = [];
  for (const { attributes } of elements(workbookXml, "sheet")) {
    const relation = relations.get(attributes.get("id") ?? "");
    // Abas de gráfico e de macro não são tabelas.
    if (!relation?.type.endsWith(RELATION.worksheet)) continue;
    const state = attributes.get("state") ?? "visible";
    sheets.push({
      index: sheets.length,
      name: attributes.get("name") ?? `Aba ${String(sheets.length + 1)}`,
      hidden: state !== "visible",
      path: resolvePath(base, relation.target),
    });
  }
  if (sheets.length === 0) throw new ImportError("invalid_spreadsheet");

  const target = (suffix: string) => {
    for (const relation of relations.values()) {
      if (relation.type.endsWith(suffix)) return resolvePath(base, relation.target);
    }
    return null;
  };
  const sharedStringsPath = target(RELATION.sharedStrings);
  const stylesPath = target(RELATION.styles);
  const properties = firstElement(workbookXml, "workbookPr");
  const date1904 = ["1", "true"].includes(properties?.attributes.get("date1904") ?? "");

  return {
    archive,
    sheets,
    sharedStrings: sharedStringsPath ? readSharedStrings(archive.text(sharedStringsPath)) : [],
    dateStyles: stylesPath ? readDateStyles(archive.text(stylesPath)) : new Set(),
    date1904,
  };
}

/** Onde está o workbook (normalmente `xl/workbook.xml`), ou por que o ZIP não é uma planilha. */
function findWorkbookPath(archive: ZipArchive): string {
  if (!archive.has("[Content_Types].xml")) {
    if (archive.has("mimetype") || archive.has("content.xml")) {
      throw new UnsupportedFormatError(
        "Planilhas do LibreOffice e do OpenOffice (.ods) não são aceitas.",
      );
    }
    throw new ImportError("unsupported_file_type");
  }
  const rootRelations = readRelations(archive, "_rels/.rels");
  let path = "xl/workbook.xml";
  for (const relation of rootRelations.values()) {
    if (relation.type.endsWith(RELATION.officeDocument)) path = resolvePath("", relation.target);
  }
  if (path.endsWith(".bin")) {
    throw new UnsupportedFormatError("Planilhas binárias do Excel (.xlsb) não são aceitas.");
  }
  if (!archive.has(path)) {
    if (archive.has("word/document.xml")) {
      throw new UnsupportedFormatError("Este arquivo é um documento do Word, não uma planilha.");
    }
    if (archive.has("ppt/presentation.xml")) {
      throw new UnsupportedFormatError("Este arquivo é uma apresentação, não uma planilha.");
    }
    throw new ImportError("invalid_spreadsheet");
  }
  return path;
}

interface Relation {
  readonly type: string;
  readonly target: string;
}

function readRelations(archive: ZipArchive, path: string): Map<string, Relation> {
  const relations = new Map<string, Relation>();
  const xml = archive.text(path);
  if (xml === null) return relations;
  for (const { attributes } of elements(xml, "Relationship")) {
    if (attributes.get("TargetMode") === "External") continue;
    relations.set(attributes.get("Id") ?? "", {
      type: attributes.get("Type") ?? "",
      target: attributes.get("Target") ?? "",
    });
  }
  return relations;
}

function relationsPath(partPath: string): string {
  const slash = partPath.lastIndexOf("/");
  return `${partPath.slice(0, slash + 1)}_rels/${partPath.slice(slash + 1)}.rels`;
}

/** Caminho de destino de uma relação: relativo à pasta da parte, ou absoluto ("/xl/..."). */
function resolvePath(base: string, target: string): string {
  const segments = (target.startsWith("/") ? target.slice(1) : base + target).split("/");
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === "..") resolved.pop();
    else if (segment && segment !== ".") resolved.push(segment);
  }
  return resolved.join("/");
}

function readSharedStrings(xml: string | null): string[] {
  if (xml === null) return [];
  const strings: string[] = [];
  for (const { inner } of elements(xml, "si")) strings.push(inner === null ? "" : richText(inner));
  return strings;
}

/** Índices de estilos de célula (cellXfs) cujo formato de número é data ou horário. */
function readDateStyles(xml: string | null): Set<number> {
  const dateStyles = new Set<number>();
  if (xml === null) return dateStyles;
  const customFormats = new Map<number, string>();
  for (const { attributes } of elements(xml, "numFmt")) {
    customFormats.set(Number(attributes.get("numFmtId")), attributes.get("formatCode") ?? "");
  }
  const cellFormats = firstElement(xml, "cellXfs");
  if (cellFormats?.inner == null) return dateStyles;
  let index = 0;
  for (const { attributes } of elements(cellFormats.inner, "xf")) {
    if (isDateFormat(Number(attributes.get("numFmtId") ?? 0), customFormats)) dateStyles.add(index);
    index += 1;
  }
  return dateStyles;
}

const SHEET_DATA = new RegExp(
  `<${PREFIX}sheetData(?=[\\s/>])[^>]*>([\\s\\S]*?)</${PREFIX}sheetData>`,
);
const ROW_OR_CELL = new RegExp(
  `<${PREFIX}(?:row(?=[\\s/>])${TAG_ATTRIBUTES}/?>|c(?=[\\s/>])${TAG_ATTRIBUTES}(?:/>|>([\\s\\S]*?)</${PREFIX}c>))`,
  "g",
);
const VALUE = new RegExp(`<${PREFIX}v(?=[\\s/>])[^>]*>([\\s\\S]*?)</${PREFIX}v>`);
const INLINE_STRING = new RegExp(`<${PREFIX}is(?=[\\s/>])[^>]*>([\\s\\S]*?)</${PREFIX}is>`);
const CELL_REFERENCE = /^([A-Z]{1,3})(\d+)$/;

function readRows(context: WorkbookContext, sheet: SheetPart): Row[] {
  const xml = context.archive.text(sheet.path);
  if (xml === null) throw new ImportError("invalid_spreadsheet");
  const sheetData = SHEET_DATA.exec(xml)?.[1] ?? "";

  const rows: Cell[][] = [];
  let rowIndex = -1;
  let column = -1;
  let filledRows = 0;
  let lastFilledRow = -1;

  for (const match of sheetData.matchAll(ROW_OR_CELL)) {
    const rowAttributes = match[1];
    if (rowAttributes !== undefined) {
      const declared = Number(parseAttributes(rowAttributes).get("r"));
      rowIndex = Number.isInteger(declared) && declared > 0 ? declared - 1 : rowIndex + 1;
      column = -1;
      continue;
    }
    const attributes = parseAttributes(match[2] ?? "");
    const reference = CELL_REFERENCE.exec(attributes.get("r") ?? "");
    if (reference) {
      column = columnIndex(reference[1] ?? "A");
      rowIndex = Number(reference[2]) - 1;
    } else {
      column += 1;
      if (rowIndex < 0) rowIndex = 0;
    }
    if (column >= LIMITS.maxColumns) continue;
    const cell = readCell(context, attributes, match[3] ?? null);
    if (!hasContent(cell)) continue;

    // Muitas linhas vazias seguidas: o restante da aba é formatação, não dados.
    if (rowIndex - lastFilledRow > LIMITS.maxBlankStreak) break;
    let row = rows[rowIndex];
    if (!row) {
      row = [];
      rows[rowIndex] = row;
      filledRows += 1;
      // +1: a primeira linha pode ser cabeçalho.
      if (filledRows > LIMITS.maxParticipants + 1) throw new ImportError("too_many_rows");
    }
    row[column] = cell;
    lastFilledRow = Math.max(lastFilledRow, rowIndex);
  }
  // Linhas sem dados ficam vazias, preservando a numeração da planilha.
  return Array.from({ length: lastFilledRow + 1 }, (_, index) => rows[index] ?? []);
}

function readCell(
  context: WorkbookContext,
  attributes: Map<string, string>,
  inner: string | null,
): Cell {
  if (inner === null) return EMPTY_CELL;
  const type = attributes.get("t") ?? "n";
  if (type === "inlineStr") {
    const inline = INLINE_STRING.exec(inner)?.[1];
    return inline === undefined ? EMPTY_CELL : textCell(richText(inline));
  }
  const raw = VALUE.exec(inner)?.[1];
  if (raw === undefined) return EMPTY_CELL; // fórmula sem resultado salvo
  switch (type) {
    case "s":
      return textCell(context.sharedStrings[Number(raw)] ?? "");
    case "str":
      return textCell(decodeXml(raw));
    case "b":
      return booleanCell(raw.trim() === "1" || raw.trim() === "true");
    case "e":
      return errorCell(decodeXml(raw).trim());
    case "d":
      return isoDateCell(decodeXml(raw).trim());
    default: {
      const value = Number(raw);
      if (raw.trim() === "" || Number.isNaN(value)) return EMPTY_CELL;
      const style = Number(attributes.get("s") ?? 0);
      return context.dateStyles.has(style)
        ? serialDateCell(value, context.date1904)
        : numberCell(value);
    }
  }
}

/** "A" → 0, "Z" → 25, "AA" → 26. */
function columnIndex(letters: string): number {
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

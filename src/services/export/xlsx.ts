/**
 * Planilha .xlsx gerada no navegador: cabeçalho com os metadados do sorteio e tabela de
 * vencedores.
 *
 * Escrita direto no formato Office Open XML (mínimo aceito pelo Excel, Google Planilhas,
 * LibreOffice e Numbers) e compactada com `fflate`. Textos vão como "inline string": nunca são
 * interpretados como fórmula, mesmo que comecem com "=".
 */
import { strToU8, zipSync } from "fflate";
import {
  describeAlgorithm,
  EXPORT_NOTE,
  localDateTime,
  yesNo,
  type ExportDocument,
  type ExportRound,
} from "./document";

type CellValue = string | number | null;

/** Estilos definidos em `styles.xml` (índices de cellXfs). */
const STYLE = { normal: 0, label: 1, title: 2, header: 3, note: 4, value: 5 } as const;
type Style = (typeof STYLE)[keyof typeof STYLE];

interface SheetCell {
  readonly value: CellValue;
  readonly style: Style;
}

const COLUMN_WIDTHS = [28, 48, 12, 40, 12, 12, 14];
// Caracteres proibidos no XML 1.0 (controles, exceto tab e quebras de linha).
// eslint-disable-next-line no-control-regex -- remove justamente os caracteres de controle
const INVALID_XML = /[\u{0}-\u{8}\u{b}\u{c}\u{e}-\u{1f}\u{fffe}\u{ffff}]/gu;

export function writeXlsx(document: ExportDocument): Uint8Array {
  const rows: SheetCell[][] = [];
  const add = (...cells: SheetCell[]) => rows.push(cells);
  const cell = (value: CellValue, style: Style = STYLE.value): SheetCell => ({ value, style });

  add(cell("Resultado do sorteio", STYLE.title));
  add();
  const [single] = document.rounds.length === 1 ? document.rounds : [];
  const metadata: [string, CellValue][] = [
    ["Sorteio", document.drawName],
    ["Rodadas", document.rounds.map((round) => round.number).join(", ")],
    ["Fuso horário", document.timeZone],
    ["Arquivo gerado em", localDateTime(document.generatedAt, document.timeZone)],
    ...(single ? roundMetadata(single, document.timeZone) : []),
  ];
  for (const [label, value] of metadata) add(cell(label, STYLE.label), cell(value));
  add();

  const headerRow = rows.length + 1;
  if (single) {
    add(cell("Posição", STYLE.header), cell("Vencedor", STYLE.header));
    for (const winner of single.winners) add(cell(winner.position), cell(winner.name));
  } else {
    const titles = [
      "Rodada",
      "Data e hora",
      "Posição",
      "Vencedor",
      "Repetição",
      "Removidos",
      "Disponíveis",
    ];
    add(...titles.map((title) => cell(title, STYLE.header)));
    for (const round of document.rounds) {
      const drawnAt = localDateTime(round.drawnAt, document.timeZone);
      for (const winner of round.winners) {
        add(
          cell(round.number),
          cell(drawnAt),
          cell(winner.position),
          cell(winner.name),
          cell(yesNo(round.allowRepeat)),
          cell(yesNo(round.removeWinners)),
          cell(round.poolSize),
        );
      }
    }
  }
  add();
  add(cell(EXPORT_NOTE, STYLE.note));

  return zipSync(
    {
      "[Content_Types].xml": xml(CONTENT_TYPES),
      "_rels/.rels": xml(ROOT_RELATIONS),
      "xl/workbook.xml": xml(WORKBOOK),
      "xl/_rels/workbook.xml.rels": xml(WORKBOOK_RELATIONS),
      "xl/styles.xml": xml(STYLES),
      "xl/worksheets/sheet1.xml": xml(sheetXml(rows, headerRow)),
    },
    { level: 6 },
  );
}

function roundMetadata(round: ExportRound, timeZone: string): [string, CellValue][] {
  return [
    ["Data e hora da rodada", localDateTime(round.drawnAt, timeZone)],
    ["Vencedores sorteados", round.quantity],
    ["Participantes disponíveis na rodada", round.poolSize],
    ["Total de participantes na lista", round.totalParticipants],
    ["Repetição na mesma rodada", yesNo(round.allowRepeat)],
    ["Vencedores removidos das próximas rodadas", yesNo(round.removeWinners)],
    ["Método", describeAlgorithm(round.algorithm)],
  ];
}

function sheetXml(rows: readonly SheetCell[][], headerRow: number): string {
  const body = rows
    .map((cells, rowIndex) => {
      const number = rowIndex + 1;
      const content = cells
        .map((sheetCell, columnIndex) =>
          cellXml(sheetCell, `${columnName(columnIndex)}${String(number)}`),
        )
        .join("");
      return `<row r="${String(number)}">${content}</row>`;
    })
    .join("");
  const columns = COLUMN_WIDTHS.map(
    (width, index) =>
      `<col min="${String(index + 1)}" max="${String(index + 1)}" width="${String(width)}" customWidth="1"/>`,
  ).join("");
  return (
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${String(headerRow)}" topLeftCell="A${String(headerRow + 1)}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/><cols>${columns}</cols>` +
    `<sheetData>${body}</sheetData></worksheet>`
  );
}

function cellXml({ value, style }: SheetCell, reference: string): string {
  if (value === null) return "";
  if (typeof value === "number")
    return `<c r="${reference}" s="${String(style)}"><v>${String(value)}</v></c>`;
  return `<c r="${reference}" s="${String(style)}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function columnName(index: number): string {
  return String.fromCharCode(65 + index);
}

function escapeXml(text: string): string {
  return text
    .replace(INVALID_XML, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xml(content: string): Uint8Array {
  return strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${content}`);
}

const CONTENT_TYPES =
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
  `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
  `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
  `</Types>`;

const ROOT_RELATIONS =
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
  `</Relationships>`;

const WORKBOOK =
  `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
  `<sheets><sheet name="Resultado" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const WORKBOOK_RELATIONS =
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
  `</Relationships>`;

// Fontes: 0 normal, 1 negrito, 2 título, 3 nota (itálico, cinza). Preenchimentos: 0 e 1 são
// obrigatórios pelo formato; 2 é o amarelo da marca no cabeçalho da tabela.
const STYLES =
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="4">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="14"/><name val="Calibri"/></font>` +
  `<font><i/><sz val="11"/><color rgb="FF5F5D57"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFF2B300"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="6">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
  `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

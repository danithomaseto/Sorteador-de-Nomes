/**
 * Leitura de planilhas .xls (Excel 97–2003, formato BIFF8) no navegador, conforme [MS-XLS].
 *
 * Só o necessário para uma lista de participantes: nomes das abas, tabela de strings
 * compartilhadas, células de texto, número, data, booleano, erro e o último resultado salvo das
 * fórmulas. Formatação, gráficos e macros são ignorados (macros nunca são executadas).
 * Planilhas criptografadas e formatos anteriores ao Excel 97 recebem mensagens próprias.
 */
import { LIMITS } from "~/config";
import {
  booleanCell,
  errorCell,
  hasContent,
  isDateFormat,
  numberCell,
  serialDateCell,
  textCell,
} from "./cells";
import { CorruptFileError, readCompoundFile } from "./cfb";
import { ImportError, UnsupportedFormatError } from "./errors";
import type { Cell, Row, SheetInfo, WorkbookTable } from "./types";

const DATA_PROBE_ROWS = 200;
const BIFF8 = 0x0600;

const RECORD = {
  BOF: 0x0809,
  EOF: 0x000a,
  CONTINUE: 0x003c,
  FILEPASS: 0x002f,
  DATEMODE: 0x0022,
  BOUNDSHEET: 0x0085,
  SST: 0x00fc,
  FORMAT: 0x041e,
  XF: 0x00e0,
  LABELSST: 0x00fd,
  LABEL: 0x0204,
  RSTRING: 0x00d6,
  NUMBER: 0x0203,
  RK: 0x027e,
  MULRK: 0x00bd,
  BOOLERR: 0x0205,
  FORMULA: 0x0006,
  STRING: 0x0207,
} as const;

const ERROR_CODES: Readonly<Record<number, string>> = {
  0x00: "#NULL!",
  0x07: "#DIV/0!",
  0x0f: "#VALUE!",
  0x17: "#REF!",
  0x1d: "#NAME?",
  0x24: "#NUM!",
  0x2a: "#N/A",
  0x2b: "#GETTING_DATA",
};

interface BiffRecord {
  readonly type: number;
  readonly data: Uint8Array;
  readonly offset: number;
}

interface SheetEntry extends SheetInfo {
  readonly position: number;
}

interface Globals {
  readonly sheets: readonly SheetEntry[];
  readonly sharedStrings: readonly string[];
  /** Formato de número (ifmt) de cada estilo de célula (XF), na ordem do arquivo. */
  readonly styleFormats: readonly number[];
  readonly customFormats: ReadonlyMap<number, string>;
  readonly date1904: boolean;
}

export function readXls(bytes: Uint8Array, requestedSheet: number | null): WorkbookTable {
  let streams: Map<string, Uint8Array>;
  try {
    streams = readCompoundFile(bytes);
  } catch {
    throw new ImportError("invalid_spreadsheet");
  }
  // Um .xlsx com senha é gravado como contêiner CFB com o pacote criptografado.
  if (streams.has("encryptedpackage") || streams.has("encryptioninfo")) {
    throw new ImportError("protected_spreadsheet");
  }
  const workbook = streams.get("workbook");
  if (!workbook) {
    if (streams.has("book")) throw new ImportError("legacy_spreadsheet");
    if (streams.has("worddocument")) {
      throw new UnsupportedFormatError("Este arquivo é um documento do Word, não uma planilha.");
    }
    if (streams.has("powerpoint document")) {
      throw new UnsupportedFormatError("Este arquivo é uma apresentação, não uma planilha.");
    }
    throw new ImportError("unsupported_file_type");
  }

  try {
    const globals = readGlobals(workbook);
    const sheets = globals.sheets.map(({ index, name, hidden }) => ({ index, name, hidden }));
    if (requestedSheet !== null) {
      const sheet = globals.sheets[requestedSheet];
      if (!sheet) throw new ImportError("sheet_not_found");
      return { sheets, selected: sheet.index, rows: readSheet(workbook, sheet, globals) };
    }
    const ordered = [...globals.sheets].sort((a, b) => Number(a.hidden) - Number(b.hidden));
    for (const sheet of ordered) {
      const rows = readSheet(workbook, sheet, globals);
      if (rows.slice(0, DATA_PROBE_ROWS).some((row) => row.some(hasContent))) {
        return { sheets, selected: sheet.index, rows };
      }
    }
    return { sheets, selected: 0, rows: [] };
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("invalid_spreadsheet");
  }
}

function* records(stream: Uint8Array, start: number): Generator<BiffRecord> {
  const view = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  let offset = start;
  while (offset + 4 <= stream.length) {
    const type = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    const end = offset + 4 + length;
    if (end > stream.length) throw new CorruptFileError();
    yield { type, data: stream.subarray(offset + 4, end), offset };
    offset = end;
  }
}

function readGlobals(stream: Uint8Array): Globals {
  const iterator = records(stream, 0);
  const first = iterator.next();
  if (first.done || first.value.type !== RECORD.BOF) throw new CorruptFileError();
  if (u16(first.value.data, 0) !== BIFF8) throw new ImportError("legacy_spreadsheet");

  const sheets: SheetEntry[] = [];
  const styleFormats: number[] = [];
  const customFormats = new Map<number, string>();
  let date1904 = false;
  let sstSegments: Uint8Array[] | null = null;
  let collectingSst = false;

  for (const record of iterator) {
    if (record.type === RECORD.CONTINUE) {
      if (collectingSst) sstSegments?.push(record.data);
      continue;
    }
    collectingSst = false;
    switch (record.type) {
      case RECORD.FILEPASS:
        throw new ImportError("protected_spreadsheet");
      case RECORD.DATEMODE:
        date1904 = u16(record.data, 0) === 1;
        break;
      case RECORD.BOUNDSHEET: {
        const kind = record.data[5] ?? 0;
        if (kind !== 0) break; // gráfico, macro ou módulo VBA
        const reader = new ByteReader([record.data], 6);
        const nameLength = reader.u8();
        const name = reader.chars(nameLength, (reader.u8() & 1) === 1);
        sheets.push({
          index: sheets.length,
          name: name || `Aba ${String(sheets.length + 1)}`,
          hidden: ((record.data[4] ?? 0) & 0x03) !== 0,
          position: u32(record.data, 0),
        });
        break;
      }
      case RECORD.FORMAT: {
        const reader = new ByteReader([record.data], 0);
        const id = reader.u16();
        customFormats.set(id, reader.unicodeString());
        break;
      }
      case RECORD.XF:
        styleFormats.push(u16(record.data, 2));
        break;
      case RECORD.SST:
        sstSegments = [record.data];
        collectingSst = true;
        break;
      case RECORD.EOF:
        return {
          sheets,
          sharedStrings: sstSegments ? readSharedStrings(sstSegments) : [],
          styleFormats,
          customFormats,
          date1904,
        };
      default:
        break;
    }
  }
  throw new CorruptFileError();
}

/** Tabela de strings: cada string pode continuar em registros CONTINUE (ver {@link ByteReader}). */
function readSharedStrings(segments: Uint8Array[]): string[] {
  const reader = new ByteReader(segments, 0);
  reader.u32(); // total de usos
  const unique = reader.u32();
  const strings: string[] = [];
  for (let i = 0; i < unique && !reader.atEnd(); i += 1) strings.push(reader.richExtendedString());
  return strings;
}

function readSheet(stream: Uint8Array, sheet: SheetEntry, globals: Globals): Row[] {
  const rows: Cell[][] = [];
  let filledRows = 0;
  let pendingFormula: { row: number; column: number } | null = null;

  const isDateStyle = (styleIndex: number) => {
    const format = globals.styleFormats[styleIndex];
    return format !== undefined && isDateFormat(format, globals.customFormats);
  };
  const numeric = (value: number, styleIndex: number) =>
    isDateStyle(styleIndex) ? serialDateCell(value, globals.date1904) : numberCell(value);
  const put = (row: number, column: number, cell: Cell) => {
    if (column >= LIMITS.maxColumns || !hasContent(cell)) return;
    let cells = rows[row];
    if (!cells) {
      cells = [];
      rows[row] = cells;
      filledRows += 1;
      // +1: a primeira linha pode ser cabeçalho.
      if (filledRows > LIMITS.maxParticipants + 1) throw new ImportError("too_many_rows");
    }
    cells[column] = cell;
  };

  const iterator = records(stream, sheet.position);
  const first = iterator.next();
  if (first.done || first.value.type !== RECORD.BOF) throw new CorruptFileError();

  for (const { type, data } of iterator) {
    if (type === RECORD.EOF) break;
    if (type === RECORD.STRING && pendingFormula) {
      const text = new ByteReader([data], 0).unicodeString();
      put(pendingFormula.row, pendingFormula.column, textCell(text));
      pendingFormula = null;
      continue;
    }
    if (type !== RECORD.CONTINUE) pendingFormula = null;
    if (data.length < 6) continue;
    const row = u16(data, 0);
    const column = u16(data, 2);
    switch (type) {
      case RECORD.LABELSST:
        put(row, column, textCell(globals.sharedStrings[u32(data, 6)] ?? ""));
        break;
      case RECORD.LABEL:
      case RECORD.RSTRING:
        put(row, column, textCell(new ByteReader([data], 6).unicodeString()));
        break;
      case RECORD.NUMBER:
        put(row, column, numeric(f64(data, 6), u16(data, 4)));
        break;
      case RECORD.RK:
        put(row, column, numeric(decodeRk(u32(data, 6)), u16(data, 4)));
        break;
      case RECORD.MULRK: {
        const count = Math.floor((data.length - 6) / 6);
        for (let i = 0; i < count; i += 1) {
          const base = 4 + i * 6;
          put(row, column + i, numeric(decodeRk(u32(data, base + 2)), u16(data, base)));
        }
        break;
      }
      case RECORD.BOOLERR: {
        const value = data[6] ?? 0;
        const cell =
          data[7] === 1 ? errorCell(ERROR_CODES[value] ?? "#N/A") : booleanCell(value === 1);
        put(row, column, cell);
        break;
      }
      case RECORD.FORMULA:
        // Resultado salvo: número (8 bytes) ou, se os bytes 6–7 forem 0xFFFF, outro tipo.
        if (data[12] === 0xff && data[13] === 0xff) {
          const resultType = data[6];
          if (resultType === 0)
            pendingFormula = { row, column }; // texto no registro STRING
          else if (resultType === 1) put(row, column, booleanCell(data[8] === 1));
          else if (resultType === 2)
            put(row, column, errorCell(ERROR_CODES[data[8] ?? 0] ?? "#N/A"));
        } else {
          put(row, column, numeric(f64(data, 6), u16(data, 4)));
        }
        break;
      default:
        break;
    }
  }
  return denseRows(rows);
}

/** Preserva a numeração das linhas e para depois de muitas linhas vazias seguidas. */
function denseRows(sparse: Cell[][]): Row[] {
  const rows: Row[] = [];
  let lastFilled = -1;
  sparse.forEach((cells, index) => {
    if (index - lastFilled > LIMITS.maxBlankStreak && lastFilled >= 0) return;
    while (rows.length < index) rows.push([]);
    rows.push(cells);
    lastFilled = index;
  });
  return rows;
}

/** Número compacto do Excel (RK): inteiro de 30 bits ou os 30 bits altos de um double. */
function decodeRk(rk: number): number {
  let value: number;
  if (rk & 0x02) {
    value = rk >> 2; // inteiro com sinal
  } else {
    const view = new DataView(new ArrayBuffer(8));
    view.setUint32(0, (rk & 0xfffffffc) >>> 0, false);
    view.setUint32(4, 0, false);
    value = view.getFloat64(0, false);
  }
  return rk & 0x01 ? value / 100 : value;
}

function u16(data: Uint8Array, offset: number): number {
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8);
}

function u32(data: Uint8Array, offset: number): number {
  return (u16(data, offset) | (u16(data, offset + 2) << 16)) >>> 0;
}

function f64(data: Uint8Array, offset: number): number {
  if (offset + 8 > data.length) return Number.NaN;
  return new DataView(data.buffer, data.byteOffset + offset, 8).getFloat64(0, true);
}

const UTF16 = new TextDecoder("utf-16le");

/**
 * Leitor sequencial sobre um registro e suas continuações (CONTINUE).
 *
 * Regra do formato: quando os caracteres de uma string atravessam o fim de um registro, o
 * registro seguinte começa com um novo byte de opções dizendo se os caracteres continuam em 8 ou
 * 16 bits. Os demais campos atravessam a fronteira sem esse byte.
 */
class ByteReader {
  private segment = 0;

  constructor(
    private readonly segments: readonly Uint8Array[],
    private position: number,
  ) {}

  atEnd(): boolean {
    this.skipFinishedSegments();
    return this.segment >= this.segments.length;
  }

  u8(): number {
    this.skipFinishedSegments();
    const current = this.segments[this.segment];
    if (!current) throw new CorruptFileError();
    const value = current[this.position] ?? 0;
    this.position += 1;
    return value;
  }

  u16(): number {
    return this.u8() | (this.u8() << 8);
  }

  u32(): number {
    return (this.u16() | (this.u16() << 16)) >>> 0;
  }

  skip(count: number): void {
    let remaining = count;
    while (remaining > 0) {
      this.skipFinishedSegments();
      const current = this.segments[this.segment];
      if (!current) return; // dados de formatação truncados no fim da tabela: irrelevantes
      const step = Math.min(remaining, current.length - this.position);
      this.position += step;
      remaining -= step;
    }
  }

  /** XLUnicodeString: tamanho de 16 bits, byte de opções e caracteres. */
  unicodeString(): string {
    const length = this.u16();
    const options = this.u8();
    return this.chars(length, (options & 0x01) === 1);
  }

  /** XLUnicodeRichExtendedString (tabela de strings): pode ter formatação e dados fonéticos. */
  richExtendedString(): string {
    const length = this.u16();
    const options = this.u8();
    const runs = options & 0x08 ? this.u16() : 0;
    const extended = options & 0x04 ? this.u32() : 0;
    const text = this.chars(length, (options & 0x01) === 1);
    this.skip(runs * 4 + extended);
    return text;
  }

  chars(count: number, sixteenBit: boolean): string {
    let wide = sixteenBit;
    let remaining = count;
    let text = "";
    while (remaining > 0) {
      let current = this.segments[this.segment];
      if (!current) throw new CorruptFileError();
      if (this.position >= current.length) {
        // Continuação no meio dos caracteres: novo byte de opções.
        this.segment += 1;
        this.position = 0;
        current = this.segments[this.segment];
        if (!current) throw new CorruptFileError();
        wide = ((current[0] ?? 0) & 0x01) === 1;
        this.position = 1;
      }
      const width = wide ? 2 : 1;
      const available = Math.floor((current.length - this.position) / width);
      if (available === 0) throw new CorruptFileError();
      const take = Math.min(remaining, available);
      const slice = current.subarray(this.position, this.position + take * width);
      text += wide ? UTF16.decode(slice) : latin1(slice);
      this.position += take * width;
      remaining -= take;
    }
    return text;
  }

  private skipFinishedSegments(): void {
    while (this.segment < this.segments.length) {
      const current = this.segments[this.segment];
      if (current && this.position < current.length) return;
      this.segment += 1;
      this.position = 0;
    }
  }
}

/** Caracteres "comprimidos" do BIFF8: UTF-16 sem o byte alto, ou seja, ISO-8859-1 puro. */
function latin1(bytes: Uint8Array): string {
  let text = "";
  for (let start = 0; start < bytes.length; start += 4096) {
    text += String.fromCharCode(...bytes.subarray(start, start + 4096));
  }
  return text;
}

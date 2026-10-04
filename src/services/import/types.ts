/** Tipos compartilhados pela importação (texto, CSV, XLSX e XLS). */

export type CellKind = "empty" | "text" | "number" | "date" | "error";

/** Valor de uma célula já convertido em texto, com o tipo de origem. */
export interface Cell {
  readonly text: string;
  readonly kind: CellKind;
}

/** Linha de uma tabela; posições sem célula ficam `undefined`. */
export type Row = readonly (Cell | undefined)[];

export interface SheetInfo {
  readonly index: number;
  readonly name: string;
  readonly hidden: boolean;
}

export interface WorkbookTable {
  readonly sheets: readonly SheetInfo[];
  readonly selected: number;
  /** Índice + 1 = número da linha na planilha. */
  readonly rows: readonly Row[];
}

export type ImportSource = "text" | "csv" | "xlsx" | "xls";
export type HeaderOption = "auto" | "yes" | "no";
export type SeparatorOption = "auto" | "newline" | "semicolon" | "comma";
export type DelimiterOption = "auto" | "semicolon" | "comma" | "tab" | "none";
/** Separador efetivamente usado: em texto, por linha, ";" ou ","; em tabelas, o delimitador. */
export type Separator = "newline" | "semicolon" | "comma" | "tab" | "none";
export type FileFormat = "xlsx" | "xls" | "csv";

export interface ImportEntry {
  /** Linha (ou item) de origem, a partir de 1. */
  readonly row: number;
  readonly name: string;
  /** Chave de duplicidade (sem acentos, maiúsculas e espaços extras). */
  readonly key: string;
  /** Linha da primeira ocorrência quando o nome se repete no próprio arquivo. */
  readonly repeatOf: number | null;
}

export type IssueCode = "too_long" | "cell_error";

export interface ImportIssue {
  readonly row: number;
  readonly code: IssueCode;
}

export interface DuplicateGroup {
  readonly name: string;
  readonly count: number;
  readonly rows: readonly number[];
}

export interface ImportStats {
  readonly rows: number;
  readonly valid: number;
  readonly empty: number;
  readonly invalid: number;
  readonly duplicates: number;
  readonly duplicateGroups: number;
  readonly dates: number;
}

export interface ColumnInfo {
  readonly index: number;
  readonly letter: string;
  readonly label: string;
  readonly samples: readonly string[];
  readonly filled: number;
}

/** Resultado da leitura, para o usuário revisar antes de adicionar. Nada é guardado. */
export interface ImportPreview {
  readonly source: ImportSource;
  readonly entries: readonly ImportEntry[];
  /** Até 100 problemas; o total está em `stats.invalid`. */
  readonly issues: readonly ImportIssue[];
  readonly duplicateGroups: readonly DuplicateGroup[];
  readonly stats: ImportStats;
  readonly separator: Separator | null;
  readonly hasHeader: boolean;
  readonly columns: readonly ColumnInfo[];
  readonly column: number | null;
  readonly sheets: readonly SheetInfo[];
  readonly sheet: number | null;
  readonly maxNameLength: number;
}

export interface TextImportOptions {
  readonly separator: SeparatorOption;
  readonly header: HeaderOption;
  readonly column: number | null;
}

export interface FileImportOptions {
  readonly sheet: number | null;
  readonly header: HeaderOption;
  readonly column: number | null;
  readonly delimiter: DelimiterOption;
  /** Pista vinda da extensão do arquivo; o conteúdo decide o formato. */
  readonly formatHint: FileFormat | null;
}

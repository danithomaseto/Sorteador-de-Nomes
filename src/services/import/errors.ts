/**
 * Erros de importação. As mensagens dizem o que aconteceu e como resolver, sem detalhes técnicos
 * e sem repetir o conteúdo do arquivo.
 */
import { LIMITS } from "~/config";
import { formatBytes, formatNumber } from "~/utils/format";

export type ImportErrorCode =
  | "empty_file"
  | "file_too_large"
  | "spreadsheet_too_large"
  | "unsupported_file_type"
  | "legacy_spreadsheet"
  | "protected_spreadsheet"
  | "invalid_spreadsheet"
  | "invalid_text_file"
  | "too_many_rows"
  | "text_too_long"
  | "sheet_not_found"
  | "column_not_found"
  | "import_timeout"
  | "import_failed";

/** Forma serializável (atravessa a fronteira do Web Worker). */
export interface ImportFailure {
  readonly code: ImportErrorCode;
  readonly title: string;
  readonly message: string;
}

const SAVE_AS_XLSX = "Abra no Excel ou no Google Planilhas e salve como .xlsx ou .csv.";

const FAILURES: Record<ImportErrorCode, () => Omit<ImportFailure, "code">> = {
  empty_file: () => ({ title: "Arquivo vazio", message: "O arquivo está vazio. Escolha outro." }),
  file_too_large: () => ({
    title: "Arquivo grande demais",
    message: `O arquivo passa do limite de ${formatBytes(LIMITS.maxFileBytes)}. Remova colunas ou abas que não sejam necessárias, ou divida a lista.`,
  }),
  spreadsheet_too_large: () => ({
    title: "Planilha grande demais",
    message:
      "A planilha é grande demais para importar. Remova abas, colunas ou formatações que não sejam necessárias e tente novamente.",
  }),
  unsupported_file_type: () => ({
    title: "Formato não suportado",
    message:
      "Use uma planilha do Excel (.xlsx ou .xls) ou um arquivo .csv. Se a lista estiver em outro programa, salve-a num desses formatos antes de importar.",
  }),
  legacy_spreadsheet: () => ({
    title: "Planilha muito antiga",
    message: `Esta planilha foi salva num formato do Excel 95 ou anterior. ${SAVE_AS_XLSX}`,
  }),
  protected_spreadsheet: () => ({
    title: "Planilha protegida por senha",
    message: "Abra a planilha no Excel, remova a senha e salve novamente antes de importar.",
  }),
  invalid_spreadsheet: () => ({
    title: "Não foi possível ler a planilha",
    message: `O arquivo parece estar corrompido ou incompleto. Verifique se ele abre normalmente no Excel. ${SAVE_AS_XLSX}`,
  }),
  invalid_text_file: () => ({
    title: "Arquivo de texto inválido",
    message: "Não foi possível ler o arquivo como texto. Verifique se ele é um .csv válido.",
  }),
  too_many_rows: () => ({
    title: "Linhas demais",
    message: `A lista tem mais de ${formatNumber(LIMITS.maxParticipants)} linhas com dados (limite por sorteio). Divida a lista ou remova linhas que não são participantes.`,
  }),
  text_too_long: () => ({
    title: "Texto longo demais",
    message: "O texto colado é longo demais. Divida a lista em partes menores.",
  }),
  sheet_not_found: () => ({
    title: "Aba não encontrada",
    message: "A aba escolhida não existe nesta planilha.",
  }),
  column_not_found: () => ({
    title: "Coluna não encontrada",
    message: "A coluna escolhida não existe neste arquivo.",
  }),
  import_timeout: () => ({
    title: "A leitura demorou demais",
    message:
      "O arquivo demorou demais para ser lido. Remova abas ou colunas que não sejam necessárias e tente novamente.",
  }),
  import_failed: () => ({
    title: "Não foi possível importar",
    message: "Algo deu errado ao ler o arquivo. Tente novamente ou use outro formato.",
  }),
};

export class ImportError extends Error {
  readonly failure: ImportFailure;

  constructor(readonly code: ImportErrorCode) {
    super(code);
    this.name = "ImportError";
    this.failure = { code, ...FAILURES[code]() };
  }
}

export function importFailure(code: ImportErrorCode): ImportFailure {
  return new ImportError(code).failure;
}

/** Mensagem específica para formatos que costumam chegar por engano. */
export function unsupportedFormat(detail: string): ImportFailure {
  return {
    code: "unsupported_file_type",
    title: "Formato não suportado",
    message: `${detail} ${SAVE_AS_XLSX}`,
  };
}

export class UnsupportedFormatError extends ImportError {
  override readonly failure: ImportFailure;

  constructor(detail: string) {
    super("unsupported_file_type");
    this.failure = unsupportedFormat(detail);
  }
}

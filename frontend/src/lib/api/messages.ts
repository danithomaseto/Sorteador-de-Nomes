import { formatBytes, formatNumber } from "../format";
import { ApiError } from "./client";

const GENERIC = "Não foi possível concluir a operação. Tente novamente em instantes.";

function param(error: ApiError, name: string): number {
  const value = error.params[name];
  return typeof value === "number" ? value : Number(value ?? 0);
}

/** Mensagem amigável para qualquer erro: nunca mostra detalhes técnicos. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return GENERIC;
  switch (error.code) {
    case "network_error":
      return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
    case "rate_limited":
      return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
    case "internal_error":
      return "Algo deu errado do nosso lado. Tente novamente em instantes.";
    case "insufficient_participants": {
      const available = param(error, "available");
      return available === 1
        ? "Há apenas 1 participante disponível. Diminua a quantidade ou permita repetição."
        : `Há ${formatNumber(available)} participantes disponíveis. Diminua a quantidade ou permita repetição.`;
    }
    case "empty_pool":
      return "Não há participantes disponíveis para sortear.";
    case "file_too_large":
      return `O arquivo passa do limite de ${formatBytes(param(error, "max_bytes"))}. Remova colunas ou abas desnecessárias, ou divida a lista.`;
    case "payload_too_large":
      return "A lista é grande demais para enviar de uma vez. Divida em partes menores.";
    case "unsupported_file_type":
      return "Envie uma planilha do Excel (.xlsx) ou um arquivo .csv.";
    case "too_many_rows":
      return `A lista passa do limite de ${formatNumber(param(error, "max_rows"))} participantes. Divida a lista ou remova linhas que não são participantes.`;
    case "invalid_request":
      return GENERIC;
    default:
      return error.detail && error.status < 500 ? error.detail : GENERIC;
  }
}

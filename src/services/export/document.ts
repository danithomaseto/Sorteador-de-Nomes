/** Conteúdo de uma exportação e textos comuns a todos os formatos. */
import { APP_NAME } from "~/config";
import { WITH_REPETITION, WITHOUT_REPETITION } from "~/services/draw";

export type ExportFormat = "txt" | "csv" | "xlsx";

export interface ExportWinner {
  readonly position: number;
  readonly name: string;
}

export interface ExportRound {
  readonly number: number;
  /** Momento da rodada (ISO 8601, relógio do dispositivo). */
  readonly drawnAt: string;
  readonly quantity: number;
  readonly allowRepeat: boolean;
  readonly removeWinners: boolean;
  readonly totalParticipants: number;
  readonly poolSize: number;
  readonly algorithm: string;
  readonly winners: readonly ExportWinner[];
}

export interface ExportDocument {
  readonly drawName: string;
  /** Fuso horário IANA usado para mostrar datas (ex.: "America/Sao_Paulo"). */
  readonly timeZone: string;
  readonly generatedAt: Date;
  readonly rounds: readonly ExportRound[];
}

const METHODS: Readonly<Record<string, string>> = {
  [WITHOUT_REPETITION]: "sem repetição na rodada (Fisher–Yates parcial)",
  [WITH_REPETITION]: "com reposição (sorteios independentes)",
};
const SOURCES: Readonly<Record<string, string>> = {
  "web-crypto": "gerador de números aleatórios criptográfico do navegador (Web Crypto)",
};
const SLUG_LENGTH = 40;

export function localDateTime(moment: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(typeof moment === "string" ? new Date(moment) : moment);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

export function yesNo(value: boolean): string {
  return value ? "Sim" : "Não";
}

export function describeAlgorithm(algorithm: string): string {
  const [method = "", source = ""] = algorithm.split("+");
  return `Seleção aleatória ${METHODS[method] ?? method}, com o ${SOURCES[source] ?? source}.`;
}

/** Ordem no sorteio: "1º", "2º"… */
export function ordinal(position: number): string {
  return `${String(position)}º`;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_LENGTH)
    .replace(/-+$/g, "");
}

export function exportFileName(document: ExportDocument, extension: ExportFormat | "png"): string {
  const base = slugify(document.drawName) || "sorteio";
  const [only] = document.rounds;
  const suffix = document.rounds.length === 1 && only ? `rodada-${String(only.number)}` : "rodadas";
  return `${base}-${suffix}.${extension}`;
}

export const EXPORT_NOTE = `Gerado no navegador pelo ${APP_NAME}. Nenhum dado do sorteio foi enviado a servidores: guarde este arquivo se precisar de um registro.`;

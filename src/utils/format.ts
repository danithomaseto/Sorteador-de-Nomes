const numbers = new Intl.NumberFormat("pt-BR");
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const dateTimeSeconds = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
});
const time = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" });
const longDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatNumber(value: number): string {
  return numbers.format(value);
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/** "1 participante", "1.250 participantes". */
export function countLabel(count: number, singular: string, pluralForm: string): string {
  return `${formatNumber(count)} ${plural(count, singular, pluralForm)}`;
}

export function formatDateTime(iso: string, withSeconds = false): string {
  return (withSeconds ? dateTimeSeconds : dateTime).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

export function formatDate(date: Date): string {
  return longDate.format(date);
}

export function formatBytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) return `${numbers.format(Math.round(megabytes * 10) / 10)} MB`;
  return `${numbers.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

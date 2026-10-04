/**
 * Proteção contra injeção de fórmula em planilhas (CSV injection, OWASP).
 *
 * Um nome como `=HYPERLINK("http://…")` seria executado como fórmula ao abrir o arquivo no
 * Excel. No CSV, valores que começam com `= + - @`, tab ou CR recebem um apóstrofo na frente. No
 * XLSX, as células de texto são gravadas como texto explícito, então nunca viram fórmula.
 */
const FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

export function neutralizeFormula(value: string): string {
  return FORMULA_TRIGGERS.some((trigger) => value.startsWith(trigger)) ? `'${value}` : value;
}

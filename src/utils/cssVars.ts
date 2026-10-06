import type { CSSProperties } from "react";

/**
 * Variáveis CSS num `style` do React. Aplicadas pelo CSSOM (não como atributo), então a
 * Content-Security-Policy sem `unsafe-inline` continua valendo.
 */
export function cssVars(vars: Record<`--${string}`, string | number>): CSSProperties {
  return vars;
}

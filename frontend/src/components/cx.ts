/** Junta classes CSS, ignorando valores vazios. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

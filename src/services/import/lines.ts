// Quebras de linha reconhecidas (as mesmas do `str.splitlines` do Python, usado antes no servidor).
// eslint-disable-next-line no-control-regex -- separadores U+001C–U+001E são quebras de linha
const LINE_BREAK = /\r\n|[\n\r\v\f\u{1c}-\u{1e}\u{85}\u{2028}\u{2029}]/u;

/** Divide em linhas; uma quebra no fim do texto não gera uma linha vazia extra. */
export function splitLines(text: string): string[] {
  if (!text) return [];
  const lines = text.split(LINE_BREAK);
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

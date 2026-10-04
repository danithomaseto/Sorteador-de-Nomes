/**
 * Normalização de nomes de participantes.
 *
 * Implementação única, usada por todas as fontes (digitação, texto colado, CSV, XLSX, XLS) e
 * também para o nome do sorteio. Regras:
 *
 * - qualquer espaço (inclusive tab, quebra de linha e espaço não separável) vira um espaço
 *   simples; espaços repetidos e nas pontas são removidos;
 * - caracteres de controle e invisíveis são removidos: eles podem esconder diferenças entre nomes
 *   ou inverter a direção do texto na tela;
 * - o resultado fica em Unicode NFC (um "João" digitado no macOS pode chegar decomposto);
 * - maiúsculas e acentos são preservados: nunca "corrigimos" nomes.
 *
 * A chave de duplicidade ({@link matchKey}) ignora maiúsculas, acentos, espaços extras e
 * variações de compatibilidade Unicode: "JOÃO  silva" e "joao silva" têm a mesma chave.
 */
import { LIMITS } from "~/config";

const MAX_MATCH_KEY_LENGTH = 255;

/**
 * Faixas de caracteres removidos (código inicial e final, inclusivos): controles que não são
 * espaço, invisíveis que podem esconder diferenças ou inverter a direção do texto, surrogates
 * soltos e uso privado (aparecem como caixas vazias). ZWJ/ZWNJ (U+200C/U+200D) ficam: são usados
 * em emojis compostos e em algumas escritas.
 */
const REMOVED_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x0008], // controles C0
  [0x000e, 0x001b], // controles C0 (U+001C–U+001F são separadores tratados como espaço)
  [0x007f, 0x0084], // DEL e controles C1
  [0x0086, 0x009f], // controles C1 (U+0085 é quebra de linha, tratada como espaço)
  [0x00ad, 0x00ad], // hífen condicional
  [0x180e, 0x180e], // separador de vogal mongol
  [0x200b, 0x200b], // espaço de largura zero
  [0x200e, 0x200f], // marcas de direção do texto
  [0x202a, 0x202e], // incorporações e substituições bidirecionais
  [0x2060, 0x2064], // word joiner e operadores invisíveis
  [0x2066, 0x2069], // isolamentos bidirecionais
  [0xd800, 0xdfff], // surrogates soltos
  [0xe000, 0xf8ff], // uso privado (plano básico)
  [0xfeff, 0xfeff], // BOM / espaço não separável de largura zero
  [0xf0000, 0x10ffff], // uso privado suplementar
];

const hex = (codePoint: number) => codePoint.toString(16);

// O padrão é montado com escapes \u{…}: nenhum caractere invisível aparece no código-fonte.
const REMOVED = new RegExp(
  `[${REMOVED_RANGES.map(([first, last]) => `\\u{${hex(first)}}-\\u{${hex(last)}}`).join("")}]`,
  "gu",
);
// Espaços do Unicode (\s) mais separadores de informação e "próxima linha", que o Python também
// trata como espaço.
// eslint-disable-next-line no-control-regex -- os separadores U+001C–U+001F são intencionais
const WHITESPACE = /[\s\u{1c}-\u{1f}\u{85}]+/gu;
const NON_SPACING_MARKS = /\p{Mn}/gu;

export type NameProblem = "empty" | "too_long";

/** Normaliza um nome sem validá-lo (pode devolver texto vazio ou longo demais). */
export function normalizeName(raw: string): string {
  return raw.replace(REMOVED, "").replace(WHITESPACE, " ").trim().normalize("NFC");
}

/** Quantidade de caracteres como a pessoa os vê (pontos de código, não unidades UTF-16). */
export function nameLength(name: string): number {
  return Array.from(name).length;
}

/** Verifica um nome já normalizado. */
export function nameProblem(
  name: string,
  maxLength: number = LIMITS.maxNameLength,
): NameProblem | null {
  if (!name) return "empty";
  // A maioria dos nomes é curta: só conta pontos de código quando pode passar do limite.
  if (name.length > maxLength && nameLength(name) > maxLength) return "too_long";
  return null;
}

function isAscii(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) > 0x7f) return false;
  }
  return true;
}

/** Chave para detectar possíveis duplicados; nunca é exibida. */
export function matchKey(name: string): string {
  const key = isAscii(name)
    ? name.toLowerCase()
    : name.toLowerCase().normalize("NFKD").replace(NON_SPACING_MARKS, "").toLowerCase();
  return key.replace(WHITESPACE, " ").trim().slice(0, MAX_MATCH_KEY_LENGTH);
}

export type NameCheck =
  | { readonly ok: true; readonly name: string; readonly key: string }
  | { readonly ok: false; readonly problem: NameProblem };

/** Normaliza e valida um nome digitado: devolve o nome pronto e a chave, ou o problema. */
export function checkName(raw: string, maxLength: number = LIMITS.maxNameLength): NameCheck {
  const name = normalizeName(raw);
  const problem = nameProblem(name, maxLength);
  return problem ? { ok: false, problem } : { ok: true, name, key: matchKey(name) };
}

export function nameProblemMessage(
  problem: NameProblem,
  maxLength: number = LIMITS.maxNameLength,
): string {
  return problem === "empty"
    ? "O nome não pode ficar vazio."
    : `O nome pode ter no máximo ${String(maxLength)} caracteres.`;
}

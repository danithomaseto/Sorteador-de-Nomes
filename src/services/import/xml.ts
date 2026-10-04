/**
 * Leitura mínima de XML para as partes de um .xlsx.
 *
 * O `DOMParser` não existe em Web Workers e um parser genérico seria pesado para planilhas
 * grandes. As partes do formato (workbook, abas, strings compartilhadas) são regulares, então
 * expressões regulares bastam. Só as cinco entidades do XML e referências numéricas são
 * decodificadas: DTDs e entidades personalizadas são ignoradas, o que elimina por construção os
 * ataques de expansão de entidades (billion laughs) e de entidades externas (XXE).
 */

const REPLACEMENT_CHARACTER = String.fromCodePoint(0xfffd);
const ENTITY = /&(?:#(\d{1,7})|#x([\da-f]{1,6})|(amp|lt|gt|quot|apos));/gi;
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const ATTRIBUTE = /([\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
// Atributos de uma tag (aspas podem conter ">").
const TAG_ATTRIBUTES = String.raw`((?:[^>"'/]|"[^"]*"|'[^']*'|/(?!>))*)`;
const PREFIX = String.raw`(?:[\w.-]+:)?`;

export function decodeXml(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(ENTITY, (_match, decimal?: string, hexadecimal?: string, name?: string) => {
    if (name) return NAMED[name.toLowerCase()] ?? "";
    const codePoint = decimal ? Number(decimal) : Number.parseInt(hexadecimal ?? "", 16);
    return codePoint > 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : REPLACEMENT_CHARACTER;
  });
}

/** Atributos pelo nome local (sem prefixo de namespace): `r:id` → `id`. */
export function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) {
    const qualified = match[1] ?? "";
    const local = qualified.slice(qualified.indexOf(":") + 1);
    attributes.set(local, decodeXml(match[2] ?? match[3] ?? ""));
  }
  return attributes;
}

export interface XmlElement {
  readonly attributes: Map<string, string>;
  /** Conteúdo bruto entre as tags; `null` em elementos vazios (`<x/>`). */
  readonly inner: string | null;
}

/** Elementos com o nome local dado, em ordem (não aninhados entre si). */
export function* elements(xml: string, localName: string): Generator<XmlElement> {
  const pattern = new RegExp(
    `<${PREFIX}${localName}(?=[\\s/>])${TAG_ATTRIBUTES}(?:/>|>([\\s\\S]*?)</${PREFIX}${localName}\\s*>)`,
    "g",
  );
  for (const match of xml.matchAll(pattern)) {
    yield { attributes: parseAttributes(match[1] ?? ""), inner: match[2] ?? null };
  }
}

export function firstElement(xml: string, localName: string): XmlElement | null {
  for (const element of elements(xml, localName)) return element;
  return null;
}

const TEXT_RUN = new RegExp(
  `<${PREFIX}t(?=[\\s/>])${TAG_ATTRIBUTES}(?:/>|>([\\s\\S]*?)</${PREFIX}t>)`,
  "g",
);
const PHONETIC = new RegExp(`<${PREFIX}rPh\\b[\\s\\S]*?</${PREFIX}rPh>`, "g");

/** Texto de uma string do Excel (`<si>` ou `<is>`): junta os trechos `<t>`, sem a fonética. */
export function richText(inner: string): string {
  const content = inner.includes("rPh") ? inner.replace(PHONETIC, "") : inner;
  let text = "";
  for (const match of content.matchAll(TEXT_RUN)) text += decodeXml(match[2] ?? "");
  return text;
}

export const xmlPatterns = { PREFIX, TAG_ATTRIBUTES };

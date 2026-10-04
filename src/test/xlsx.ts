import { strToU8, zipSync } from "fflate";

type Value = string | number | boolean | null;

interface SheetSpec {
  name: string;
  rows: readonly (readonly Value[])[];
  hidden?: boolean;
}

interface MakeXlsxOptions {
  /** Textos como strings compartilhadas (padrão do Excel) ou "inline". */
  strings?: "shared" | "inline";
  /** Prefixo de namespace nos elementos da aba (alguns geradores usam "x:"). */
  prefix?: string;
  /** Linhas (1, 2…) cujas células numéricas usam formato de data. */
  dateRows?: readonly number[];
  extraFiles?: Record<string, string>;
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function column(index: number): string {
  let letters = "";
  let number = index + 1;
  while (number > 0) {
    letters = String.fromCharCode(65 + ((number - 1) % 26)) + letters;
    number = Math.floor((number - 1) / 26);
  }
  return letters;
}

/** Cria um .xlsx mínimo em memória para os testes (nenhum dado real de pessoas). */
export function makeXlsx(sheets: readonly SheetSpec[], options: MakeXlsxOptions = {}): Uint8Array {
  const { strings = "shared", prefix = "", dateRows = [], extraFiles = {} } = options;
  const p = prefix ? `${prefix}:` : "";
  const shared: string[] = [];
  const files: Record<string, Uint8Array> = {};

  sheets.forEach((sheet, sheetIndex) => {
    const rows = sheet.rows
      .map((row, rowIndex) => {
        const number = rowIndex + 1;
        const cells = row
          .map((value, columnIndex) => {
            const reference = `${column(columnIndex)}${String(number)}`;
            if (value === null) return "";
            if (typeof value === "boolean") {
              return `<${p}c r="${reference}" t="b"><${p}v>${value ? 1 : 0}</${p}v></${p}c>`;
            }
            if (typeof value === "number") {
              const style = dateRows.includes(number) ? ' s="1"' : "";
              return `<${p}c r="${reference}"${style}><${p}v>${String(value)}</${p}v></${p}c>`;
            }
            if (value.startsWith("#")) {
              return `<${p}c r="${reference}" t="e"><${p}v>${escape(value)}</${p}v></${p}c>`;
            }
            if (strings === "inline") {
              return `<${p}c r="${reference}" t="inlineStr"><${p}is><${p}t>${escape(value)}</${p}t></${p}is></${p}c>`;
            }
            shared.push(value);
            return `<${p}c r="${reference}" t="s"><${p}v>${String(shared.length - 1)}</${p}v></${p}c>`;
          })
          .join("");
        return `<${p}row r="${String(number)}">${cells}</${p}row>`;
      })
      .join("");
    const ns = prefix
      ? `xmlns:${prefix}="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`
      : `xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`;
    files[`xl/worksheets/sheet${String(sheetIndex + 1)}.xml`] = strToU8(
      `<?xml version="1.0"?><${p}worksheet ${ns}><${p}sheetData>${rows}</${p}sheetData></${p}worksheet>`,
    );
  });

  const sheetEntries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escape(sheet.name)}" sheetId="${String(index + 1)}"${sheet.hidden ? ' state="hidden"' : ""} r:id="rId${String(index + 1)}"/>`,
    )
    .join("");
  const sheetRelations = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${String(index + 1)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${String(index + 1)}.xml"/>`,
    )
    .join("");
  const extra = sheets.length;
  files["[Content_Types].xml"] = strToU8(
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
  );
  files["_rels/.rels"] = strToU8(
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  files["xl/workbook.xml"] = strToU8(
    `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`,
  );
  files["xl/_rels/workbook.xml.rels"] = strToU8(
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRelations}` +
      `<Relationship Id="rId${String(extra + 1)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
      `<Relationship Id="rId${String(extra + 2)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );
  files["xl/sharedStrings.xml"] = strToU8(
    `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${shared.map((text) => `<si><t xml:space="preserve">${escape(text)}</t></si>`).join("")}</sst>`,
  );
  files["xl/styles.xml"] = strToU8(
    `<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>`,
  );
  for (const [name, content] of Object.entries(extraFiles)) files[name] = strToU8(content);
  return zipSync(files);
}

/** ZIP qualquer (para arquivos que não são planilhas). */
export function makeZip(files: Record<string, string>): Uint8Array {
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])),
  );
}

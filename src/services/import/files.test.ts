import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { fixture } from "~/test/fixtures";
import { makeXlsx, makeZip } from "~/test/xlsx";
import { CFB_SIGNATURE } from "./cfb";
import { ImportError } from "./errors";
import { previewFile } from "./parse";
import type { FileImportOptions, ImportPreview } from "./types";

const DEFAULTS: FileImportOptions = {
  sheet: null,
  header: "auto",
  column: null,
  delimiter: "auto",
  formatHint: null,
};

const load = (bytes: Uint8Array, options: Partial<FileImportOptions> = {}) =>
  previewFile(bytes, { ...DEFAULTS, ...options });
const names = (preview: ImportPreview) => preview.entries.map((entry) => entry.name);
const sheet = (rows: (string | number | boolean | null)[][], name = "Plan1") =>
  makeXlsx([{ name, rows }]);

function failure(run: () => unknown): { code: string; message: string } | null {
  try {
    run();
    return null;
  } catch (error) {
    if (!(error instanceof ImportError)) throw error;
    return { code: error.failure.code, message: error.failure.message };
  }
}

const encode = (text: string) => new TextEncoder().encode(text);

describe("CSV", () => {
  it("UTF-8 com BOM e ponto e vírgula", () => {
    const bytes = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...encode("Nome;Matrícula\nJoão Silva;123\nMaria Souza;456\n"),
    ]);
    const preview = load(bytes, { formatHint: "csv" });
    expect(preview.source).toBe("csv");
    expect(preview.separator).toBe("semicolon");
    expect(preview.hasHeader).toBe(true);
    expect(names(preview)).toEqual(["João Silva", "Maria Souza"]);
    expect(preview.entries.map((entry) => entry.row)).toEqual([2, 3]);
  });

  it("Windows-1252 (exportação do Excel no Windows)", () => {
    // "Nome\nJoão\nConceição\n" em cp1252: ã = 0xE3, ç = 0xE7.
    const bytes = new Uint8Array([
      ...encode("Nome\nJo"),
      0xe3,
      ...encode("o\nConcei"),
      0xe7,
      0xe3,
      ...encode("o\n"),
    ]);
    expect(names(load(bytes))).toEqual(["João", "Conceição"]);
  });

  it("UTF-16 com BOM e tabulação", () => {
    const text = "Nome\tÁrea\nAna\tRH\n";
    const bytes = new Uint8Array(2 + text.length * 2);
    bytes.set([0xff, 0xfe]);
    for (let i = 0; i < text.length; i += 1) bytes[2 + i * 2] = text.charCodeAt(i);
    const preview = load(bytes);
    expect(preview.separator).toBe("tab");
    expect(names(preview)).toEqual(["Ana"]);
  });

  it("vírgula com aspas e aspas duplicadas", () => {
    const preview = load(encode('Nome,Cidade\n"Silva, Joao",Recife\n"Souza ""Ana""",Natal\n'));
    expect(preview.separator).toBe("comma");
    expect(names(preview)).toEqual(["Silva, Joao", 'Souza "Ana"']);
  });

  it("uma coluna sem delimitador e delimitador escolhido pela pessoa", () => {
    const single = load(encode("Ana\nBia\nCaio\n"));
    expect(single.separator).toBe("none");
    expect(single.hasHeader).toBe(false);
    expect(names(single)).toEqual(["Ana", "Bia", "Caio"]);
    expect(names(load(encode("Silva, Joao\nSouza, Ana\n"), { delimiter: "none" }))).toEqual([
      "Silva, Joao",
      "Souza, Ana",
    ]);
  });

  it("conteúdo binário é recusado", () => {
    expect(failure(() => load(new Uint8Array([65, 110, 97, 0, 1, 2])))?.code).toBe(
      "invalid_text_file",
    );
  });

  it("campo gigante é recusado quando há delimitador", () => {
    const giant = encode(`"${"x".repeat(200_000)}";b`);
    expect(failure(() => load(giant, { delimiter: "semicolon" }))?.code).toBe("invalid_text_file");
    // Sem delimitador, a linha vira um nome longo demais, apontado como problema.
    expect(load(giant).stats.invalid).toBe(1);
  });

  it("mais de 50 mil linhas com dados", () => {
    const text = Array.from({ length: 50_003 }, (_, i) => `Pessoa ${String(i)}`).join("\n");
    expect(failure(() => load(encode(text)))?.code).toBe("too_many_rows");
  });
});

describe("XLSX", () => {
  it("planilha com cabeçalho e várias colunas", () => {
    const preview = load(
      sheet([
        ["Nome", "Matrícula", "Área"],
        ["João Silva", 123, "Operações"],
        ["Maria Souza", 456, "RH"],
        ["Carlos Lima", 789, "TI"],
      ]),
    );
    expect(preview.source).toBe("xlsx");
    expect(preview.hasHeader).toBe(true);
    expect(preview.column).toBe(0);
    expect(preview.columns.map((c) => [c.label, c.letter])).toEqual([
      ["Nome", "A"],
      ["Matrícula", "B"],
      ["Área", "C"],
    ]);
    expect(preview.columns[1]?.samples).toEqual(["123", "456", "789"]);
    expect(names(preview)).toEqual(["João Silva", "Maria Souza", "Carlos Lima"]);
    expect(preview.sheets.map((s) => s.name)).toEqual(["Plan1"]);
  });

  it("escolher outra coluna; números sem casas decimais viram texto", () => {
    expect(
      names(
        load(
          sheet([
            ["Nome", "Matrícula"],
            ["Ana", 10],
            ["Bia", 20.0],
          ]),
          { column: 1 },
        ),
      ),
    ).toEqual(["10", "20"]);
  });

  it("sem cabeçalho, escolhe a coluna com nomes", () => {
    const preview = load(
      sheet([
        [1, "Ana Lima", "x"],
        [2, "Bia Souza", "y"],
        [3, "Caio Reis", null],
      ]),
    );
    expect(preview.hasHeader).toBe(false);
    expect(preview.column).toBe(1);
    expect(names(preview)).toEqual(["Ana Lima", "Bia Souza", "Caio Reis"]);
  });

  it("cabeçalho desconhecido sobre números é reconhecido", () => {
    const preview = load(
      sheet([
        ["Inscrição", "Pessoa inscrita"],
        [1, "Ana"],
        [2, "Bia"],
      ]),
    );
    expect(preview.hasHeader).toBe(true);
    expect(preview.column).toBe(1);
  });

  it("a pessoa define que não há cabeçalho", () => {
    expect(names(load(sheet([["Nome"], ["Ana"]]), { header: "no" }))).toEqual(["Nome", "Ana"]);
  });

  it("linhas e células vazias", () => {
    const preview = load(sheet([["Nome"], ["Ana"], [null], [""], ["   "], ["Bia"]]));
    expect(names(preview)).toEqual(["Ana", "Bia"]);
    expect(preview.stats.empty).toBe(3);
    expect(preview.entries.map((entry) => entry.row)).toEqual([2, 6]);
  });

  it("espaços, acentos e outras escritas", () => {
    expect(
      names(load(sheet([["Nome"], ["  Zoë   D'Ávila  "], ["Ñandú-Øster"], ["李小龍"]]))),
    ).toEqual(["Zoë D'Ávila", "Ñandú-Øster", "李小龍"]);
  });

  it("duplicados são apontados", () => {
    const preview = load(sheet([["Nome"], ["João Silva"], ["João Silva"], ["Ana"]]));
    expect(preview.entries).toHaveLength(3);
    expect(preview.stats.duplicates).toBe(1);
    expect(preview.entries[1]?.repeatOf).toBe(2);
  });

  it("datas são convertidas e contadas", () => {
    const preview = load(
      makeXlsx([{ name: "Plan1", rows: [["Nome"], [46298], [46298.774305555555]] }], {
        dateRows: [2, 3],
      }),
    );
    expect(names(preview)).toEqual(["03/10/2026", "03/10/2026 18:35"]);
    expect(preview.stats.dates).toBe(2);
  });

  it("erros de fórmula viram problemas; booleanos viram texto", () => {
    const preview = load(sheet([["Nome"], ["#N/A"], ["Ana"], [true]]));
    expect(names(preview)).toEqual(["Ana", "Verdadeiro"]);
    expect(preview.issues).toEqual([{ row: 2, code: "cell_error" }]);
  });

  it("textos em linha (inline) e elementos com prefixo de namespace", () => {
    expect(
      names(load(makeXlsx([{ name: "A", rows: [["Nome"], ["Ana"]] }], { strings: "inline" }))),
    ).toEqual(["Ana"]);
    expect(
      names(load(makeXlsx([{ name: "A", rows: [["Nome"], ["Bia"]] }], { prefix: "x" }))),
    ).toEqual(["Bia"]);
  });

  it("texto com formatação junta os trechos e ignora a fonética", () => {
    const bytes = makeXlsx([{ name: "A", rows: [["Nome"], ["placeholder"]] }], {
      extraFiles: {
        "xl/sharedStrings.xml":
          '<sst xmlns="x"><si><t>Nome</t></si><si><r><t>Ana </t></r><r><rPr><b/></rPr><t>Lima</t></r><rPh><t>アナ</t></rPh></si></sst>',
      },
    });
    expect(names(load(bytes))).toEqual(["Ana Lima"]);
  });

  it("fórmula sem resultado salvo conta como vazia", () => {
    const bytes = makeXlsx([{ name: "A", rows: [["Nome"], ["Ana"]] }], {
      extraFiles: {
        "xl/worksheets/sheet1.xml":
          '<worksheet xmlns="x"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Nome</t></is></c></row><row r="2"><c r="A2"><f>A3</f></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Ana</t></is></c></row></sheetData></worksheet>',
      },
    });
    const preview = load(bytes);
    expect(names(preview)).toEqual(["Ana"]);
    expect(preview.stats.empty).toBe(1);
  });

  it("escolhe a primeira aba visível com dados e permite trocar", () => {
    const bytes = makeXlsx([
      { name: "Vazia", rows: [] },
      { name: "Oculta", rows: [["Nome"], ["X"]], hidden: true },
      { name: "Lista", rows: [["Nome"], ["Ana"]] },
    ]);
    const preview = load(bytes);
    expect(preview.sheet).toBe(2);
    expect(preview.sheets.map((s) => [s.name, s.hidden])).toEqual([
      ["Vazia", false],
      ["Oculta", true],
      ["Lista", false],
    ]);
    expect(names(preview)).toEqual(["Ana"]);
    expect(names(load(bytes, { sheet: 1 }))).toEqual(["X"]);
    expect(load(bytes, { sheet: 0 }).entries).toEqual([]);
  });

  it("aba ou coluna inexistente", () => {
    expect(failure(() => load(sheet([["Ana"]]), { sheet: 3 }))?.code).toBe("sheet_not_found");
    expect(failure(() => load(sheet([["Ana"]]), { column: 5 }))?.code).toBe("column_not_found");
  });

  it("extensão .csv com conteúdo .xlsx: o conteúdo decide", () => {
    expect(names(load(sheet([["Nome"], ["Ana"]]), { formatHint: "csv" }))).toEqual(["Ana"]);
  });

  it("planilha real gerada pelo openpyxl", () => {
    const preview = load(fixture("basic.xlsx"));
    expect(preview.sheets.map((s) => [s.name, s.hidden])).toEqual([
      ["Inscritos", false],
      ["Oculta", true],
      ["Outra", false],
    ]);
    expect(preview.stats).toMatchObject({ valid: 12, duplicates: 1, dates: 1, invalid: 0 });
    expect(names(preview).slice(0, 3)).toEqual(["João Silva", "Maria Souza", "Conceição Araújo"]);
  });
});

describe("XLS (Excel 97–2003)", () => {
  it("abas (inclusive ocultas), cabeçalho e acentos", () => {
    const preview = load(fixture("basic.xls"));
    expect(preview.source).toBe("xls");
    expect(preview.sheets.map((s) => [s.name, s.hidden])).toEqual([
      ["Inscritos", false],
      ["Oculta", true],
      ["Outra", false],
    ]);
    expect(preview.hasHeader).toBe(true);
    expect(preview.columns.map((c) => c.label)).toEqual(["Nome", "Matrícula", "Área"]);
    expect(names(preview)).toEqual([
      "João Silva",
      "Maria Souza",
      "Conceição Araújo",
      "Zoë D'Ávila",
      "Ñandú-Øster",
      "Carlos Lima",
      "joão silva",
      "Ana Beatriz",
      "Łukasz Kowalski",
      "李小龍",
      "Bia Reis",
    ]);
    expect(preview.stats.duplicates).toBe(1);
    expect(names(load(fixture("basic.xls"), { sheet: 2 }))).toEqual(["Pedro"]);
  });

  it("números, datas e booleanos", () => {
    const preview = load(fixture("types.xls"), { header: "no" });
    expect(names(preview)).toEqual([
      "Valor",
      "42",
      "12.5",
      "03/10/2026",
      "03/10/2026 18:35",
      "Verdadeiro",
      "-7",
      "1234567",
      "Texto final",
    ]);
    expect(preview.stats.dates).toBe(2);
  });

  it("tabela de strings grande, em vários registros, com textos de 8 e 16 bits", () => {
    const preview = load(fixture("large-sst.xls"));
    expect(preview.stats.valid).toBe(3000);
    expect(names(preview)[6]).toBe(`Participante 0007 Łódź ${"x".repeat(7)}`);
    expect(names(preview).at(-1)).toBe("Participante 3000 Ação");
  });
});

describe("arquivos inválidos ou maliciosos", () => {
  it("arquivo vazio e grande demais", () => {
    expect(failure(() => load(new Uint8Array()))?.code).toBe("empty_file");
    expect(failure(() => load(new Uint8Array(10 * 1024 * 1024 + 1)))?.code).toBe("file_too_large");
  });

  it("PDF e imagens com extensão errada", () => {
    expect(failure(() => load(encode("%PDF-1.7 ..."), { formatHint: "csv" }))?.message).toContain(
      "Este arquivo é um PDF.",
    );
    expect(failure(() => load(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2])))?.message).toContain(
      "imagem",
    );
  });

  it("texto com extensão de planilha", () => {
    expect(failure(() => load(encode("Nome\nAna\n"), { formatHint: "xlsx" }))?.code).toBe(
      "invalid_spreadsheet",
    );
  });

  it("contêiner do .xls corrompido", () => {
    const bytes = new Uint8Array(1024);
    bytes.set(CFB_SIGNATURE);
    expect(failure(() => load(bytes))?.code).toBe("invalid_spreadsheet");
  });

  it("documento do Word, planilha do LibreOffice e .xlsb", () => {
    const word = makeZip({ "[Content_Types].xml": "<Types/>", "word/document.xml": "<w/>" });
    expect(failure(() => load(word))?.message).toContain("documento do Word");
    const ods = makeZip({
      mimetype: "application/vnd.oasis.opendocument.spreadsheet",
      "content.xml": "<x/>",
    });
    expect(failure(() => load(ods))?.message).toContain(".ods");
    const xlsb = makeZip({
      "[Content_Types].xml": "<Types/>",
      "_rels/.rels":
        '<Relationships><Relationship Id="r" Type="http://x/officeDocument" Target="xl/workbook.bin"/></Relationships>',
      "xl/workbook.bin": "",
    });
    expect(failure(() => load(xlsb))?.message).toContain(".xlsb");
  });

  it("ZIP corrompido e XML quebrado", () => {
    const corrupt = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...encode("lixo".repeat(100))]);
    expect(failure(() => load(corrupt))?.code).toBe("invalid_spreadsheet");
    const broken = makeZip({
      "[Content_Types].xml": "<Types",
      "xl/workbook.xml": "<workbook><sheets>",
    });
    expect(failure(() => load(broken))?.code).toBe("invalid_spreadsheet");
  });

  it("zip bomb: tamanho descompactado declarado acima do limite", () => {
    const bomb = zipSync({
      "[Content_Types].xml": strToU8("<Types/>"),
      "xl/workbook.xml": new Uint8Array(81 * 1024 * 1024),
    });
    expect(bomb.length).toBeLessThan(200_000);
    expect(failure(() => load(bomb))?.code).toBe("spreadsheet_too_large");
  });

  it("zip bomb que mente o tamanho: a leitura fica limitada ao declarado", () => {
    const bytes = makeXlsx(
      [{ name: "A", rows: [["Nome"], ...Array.from({ length: 5000 }, () => ["Ana"])] }],
      {
        strings: "inline",
      },
    );
    // Reduz o tamanho declarado da aba no diretório central para 100 bytes.
    const view = new DataView(bytes.buffer);
    for (let offset = 0; offset < bytes.length - 46; offset += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) continue;
      const nameLength = view.getUint16(offset + 28, true);
      const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      if (name === "xl/worksheets/sheet1.xml") view.setUint32(offset + 24, 100, true);
    }
    const result = (() => {
      try {
        return load(bytes).stats.valid;
      } catch (error) {
        return error instanceof ImportError ? error.code : "outro erro";
      }
    })();
    // Ou recusa, ou lê só o que cabe nos 100 bytes declarados — nunca as 5 mil linhas.
    expect(result === "invalid_spreadsheet" || (typeof result === "number" && result < 5)).toBe(
      true,
    );
  });

  it("entidades XML personalizadas não são expandidas (billion laughs)", () => {
    const bytes = makeXlsx([{ name: "A", rows: [["Nome"], ["placeholder"]] }], {
      extraFiles: {
        "xl/sharedStrings.xml":
          '<!DOCTYPE x [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]><sst><si><t>Nome</t></si><si><t>&b;</t></si></sst>',
      },
    });
    expect(names(load(bytes))).toEqual(["&b;"]);
  });
});

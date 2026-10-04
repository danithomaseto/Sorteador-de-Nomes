import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { previewFile } from "~/services/import/parse";
import { writeCsv } from "./csv";
import { exportFileName, slugify, type ExportDocument, type ExportRound } from "./document";
import { createExport } from "./index";
import { neutralizeFormula } from "./safeCells";
import { writeTxt } from "./txt";
import { writeXlsx } from "./xlsx";

const BOM = String.fromCodePoint(0xfeff);

function round(
  number: number,
  winners: string[],
  overrides: Partial<ExportRound> = {},
): ExportRound {
  return {
    number,
    drawnAt: "2026-10-03T21:35:12Z",
    quantity: winners.length,
    allowRepeat: false,
    removeWinners: true,
    totalParticipants: 127,
    poolSize: 120,
    algorithm: "partial-fisher-yates/1+web-crypto",
    winners: winners.map((name, index) => ({ position: index + 1, name })),
    ...overrides,
  };
}

const single: ExportDocument = {
  drawName: "Churrasco da equipe",
  timeZone: "America/Sao_Paulo",
  generatedAt: new Date("2026-10-03T21:40:00Z"),
  rounds: [round(1, ["Maria Souza", '=HYPERLINK("http://x")', "Zoë D'Ávila; RH"])],
};
const multiple: ExportDocument = {
  ...single,
  rounds: [round(1, ["Ana", "Bia"]), round(2, ["Caio"])],
};

describe("CSV", () => {
  it("UTF-8 com BOM, ponto e vírgula, uma linha por vencedor e horário local", () => {
    const csv = writeCsv(single);
    expect(csv.startsWith(BOM)).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("Sorteio;Rodada;Data e hora;Fuso horário;Posição;Vencedor");
    expect(lines[1]).toBe(
      "Churrasco da equipe;1;03/10/2026 18:35:12;America/Sao_Paulo;1;Maria Souza;Não;Sim;120;127",
    );
  });

  it("neutraliza fórmulas e protege o separador com aspas", () => {
    const csv = writeCsv(single);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain(`"Zoë D'Ávila; RH"`);
  });

  it.each(["=1+1", "+55 11", "-2", "@SOMA", "\tx", "\rx"])("neutraliza %j", (value) => {
    expect(neutralizeFormula(value)).toBe(`'${value}`);
  });

  it("não altera nomes comuns", () => {
    expect(neutralizeFormula("Ana-Maria")).toBe("Ana-Maria");
  });
});

describe("TXT", () => {
  it("legível, com ordem, regras e método", () => {
    const text = writeTxt(single);
    expect(text).toContain("Resultado do sorteio — Churrasco da equipe");
    expect(text).toContain("Rodada 1 · 03/10/2026 18:35:12");
    expect(text).toContain("1º  Maria Souza\r\n2º  =HYPERLINK");
    expect(text).toContain("3 sorteados entre 120 participantes disponíveis");
    expect(text).toContain("Web Crypto");
    expect(text).toContain("Nenhum dado do sorteio foi enviado a servidores");
  });
});

describe("XLSX", () => {
  it("é um pacote Office Open XML válido", () => {
    const files = unzipSync(writeXlsx(single));
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"] ?? new Uint8Array());
    // Textos sempre como texto: nunca uma fórmula.
    expect(sheet).not.toContain("<f>");
    expect(sheet).toContain("=HYPERLINK(&quot;http://x&quot;)");
  });

  it("rodada única: metadados e tabela de vencedores (lida de volta pelo importador)", () => {
    const preview = previewFile(writeXlsx(single), {
      sheet: null,
      header: "no",
      column: 1,
      delimiter: "auto",
      formatHint: null,
    });
    const values = preview.entries.map((entry) => entry.name);
    expect(values).toContain("Churrasco da equipe");
    expect(values).toContain("03/10/2026 18:35:12");
    expect(values.slice(-3)).toEqual(["Maria Souza", '=HYPERLINK("http://x")', "Zoë D'Ávila; RH"]);
  });

  it("várias rodadas: uma linha por vencedor", () => {
    const preview = previewFile(writeXlsx(multiple), {
      sheet: null,
      header: "no",
      column: 3,
      delimiter: "auto",
      formatHint: null,
    });
    expect(preview.entries.map((entry) => entry.name)).toEqual(["Vencedor", "Ana", "Bia", "Caio"]);
  });
});

describe("arquivos", () => {
  it("nomes de arquivo sem acentos nem símbolos", () => {
    expect(exportFileName(single, "xlsx")).toBe("churrasco-da-equipe-rodada-1.xlsx");
    expect(exportFileName(multiple, "csv")).toBe("churrasco-da-equipe-rodadas.csv");
    expect(exportFileName({ ...single, drawName: "!!!" }, "txt")).toBe("sorteio-rodada-1.txt");
    expect(slugify("Sorteio de 03/10/2026 — Ação")).toBe("sorteio-de-03-10-2026-acao");
  });

  it.each([
    ["txt", "text/plain;charset=utf-8"],
    ["csv", "text/csv;charset=utf-8"],
    ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ] as const)("%s com o tipo certo", (format, type) => {
    const file = createExport(single, format);
    expect(file.blob.type).toBe(type);
    expect(file.blob.size).toBeGreaterThan(0);
    expect(file.fileName.endsWith(`.${format}`)).toBe(true);
  });
});

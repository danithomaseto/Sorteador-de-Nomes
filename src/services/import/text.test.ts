import { describe, expect, it } from "vitest";
import { ImportError } from "./errors";
import { previewText } from "./parse";
import type { ImportPreview, TextImportOptions } from "./types";

const AUTO: TextImportOptions = { separator: "auto", header: "auto", column: null };

const parse = (text: string, options: Partial<TextImportOptions> = {}) =>
  previewText(text, { ...AUTO, ...options });
const names = (preview: ImportPreview) => preview.entries.map((entry) => entry.name);

function errorCode(run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (error) {
    return error instanceof ImportError ? error.code : "outro erro";
  }
}

describe("separadores", () => {
  it("uma pessoa por linha", () => {
    const preview = parse("João\nMaria\nPedro\nAna\nLucas");
    expect(names(preview)).toEqual(["João", "Maria", "Pedro", "Ana", "Lucas"]);
    expect(preview.separator).toBe("newline");
    expect(preview.entries.map((entry) => entry.row)).toEqual([1, 2, 3, 4, 5]);
  });

  it("vírgula em uma linha", () => {
    const preview = parse("João, Maria, Pedro");
    expect(names(preview)).toEqual(["João", "Maria", "Pedro"]);
    expect(preview.separator).toBe("comma");
  });

  it("ponto e vírgula tem prioridade sobre vírgula", () => {
    const preview = parse("Silva, João; Souza, Maria");
    expect(names(preview)).toEqual(["Silva, João", "Souza, Maria"]);
    expect(preview.separator).toBe("semicolon");
  });

  it("várias linhas não quebram na vírgula", () => {
    expect(names(parse("Silva, João\nSouza, Maria"))).toEqual(["Silva, João", "Souza, Maria"]);
  });

  it("separador escolhido pela pessoa", () => {
    const preview = parse("Ana, Bia\nCaio, Davi", { separator: "comma" });
    expect(names(preview)).toEqual(["Ana", "Bia", "Caio", "Davi"]);
  });

  it("quebras de linha do Windows e um único nome", () => {
    expect(names(parse("Ana\r\nBia\r\n"))).toEqual(["Ana", "Bia"]);
    expect(names(parse("Maria Souza"))).toEqual(["Maria Souza"]);
  });
});

describe("linhas e limpeza", () => {
  it("linhas vazias são ignoradas e contadas", () => {
    const preview = parse("Ana\n\n   \nBia\n");
    expect(names(preview)).toEqual(["Ana", "Bia"]);
    expect(preview.stats.empty).toBe(2);
    expect(preview.entries.map((entry) => entry.row)).toEqual([1, 4]);
  });

  it("espaços e acentos", () => {
    expect(names(parse("  José   da   Conceição  "))).toEqual(["José da Conceição"]);
  });

  it("nome longo demais vira problema na linha", () => {
    const preview = parse(`Ana\n${"x".repeat(121)}\nBia`);
    expect(names(preview)).toEqual(["Ana", "Bia"]);
    expect(preview.issues).toEqual([{ row: 2, code: "too_long" }]);
    expect(preview.stats.invalid).toBe(1);
  });

  it("lista vazia", () => {
    const preview = parse("");
    expect(preview.entries).toEqual([]);
    expect(preview.stats.valid).toBe(0);
  });
});

describe("duplicados", () => {
  it("agrupa variações e aponta a primeira ocorrência", () => {
    const preview = parse("João Silva\njoao  silva\nMaria\nJOÃO SILVA");
    expect(preview.entries).toHaveLength(4);
    expect(preview.stats.duplicates).toBe(2);
    expect(preview.duplicateGroups).toEqual([{ name: "João Silva", count: 3, rows: [1, 2, 4] }]);
    expect(preview.entries.map((entry) => entry.repeatOf)).toEqual([null, 1, null, 1]);
  });
});

describe("colunas coladas de uma planilha", () => {
  it("viram tabela com cabeçalho", () => {
    const preview = parse("Nome\tMatrícula\nAna Lima\t123\nBia Souza\t456");
    expect(preview.separator).toBe("tab");
    expect(preview.hasHeader).toBe(true);
    expect(preview.columns.map((column) => column.label)).toEqual(["Nome", "Matrícula"]);
    expect(names(preview)).toEqual(["Ana Lima", "Bia Souza"]);
  });

  it("a pessoa escolhe outra coluna", () => {
    expect(names(parse("Nome\tCidade\nAna\tRecife\nBia\tNatal", { column: 1 }))).toEqual([
      "Recife",
      "Natal",
    ]);
  });
});

describe("limites", () => {
  it("texto longo demais", () => {
    expect(errorCode(() => parse("x".repeat(2_000_001)))).toBe("text_too_long");
  });

  it("mais de 50 mil nomes", () => {
    const text = Array.from({ length: 50_001 }, (_, i) => `Pessoa ${String(i)}`).join("\n");
    expect(errorCode(() => parse(text))).toBe("too_many_rows");
  });
});

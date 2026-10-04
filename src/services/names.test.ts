import { describe, expect, it } from "vitest";
import { checkName, matchKey, nameProblem, normalizeName } from "./names";

// Caracteres invisíveis montados por código: nenhum aparece literalmente no arquivo.
const NBSP = String.fromCodePoint(0xa0);
const ZERO_WIDTH_SPACE = String.fromCodePoint(0x200b);
const RIGHT_TO_LEFT_OVERRIDE = String.fromCodePoint(0x202e);
const BOM = String.fromCodePoint(0xfeff);
const ZWJ = String.fromCodePoint(0x200d);
const COMBINING_TILDE = String.fromCodePoint(0x303);
const NUL = String.fromCodePoint(0);
const BELL = String.fromCodePoint(7);
const ESCAPE = String.fromCodePoint(0x1b);

describe("normalização", () => {
  it("remove espaços extras", () => {
    expect(normalizeName("   João    Silva   ")).toBe("João Silva");
  });

  it("tabs, quebras de linha e espaço não separável viram espaço", () => {
    expect(normalizeName(`João\tda\nSilva${NBSP}Souza`)).toBe("João da Silva Souza");
  });

  it("remove caracteres invisíveis e de controle", () => {
    expect(normalizeName(`${BOM}Ma${ZERO_WIDTH_SPACE}ria ${RIGHT_TO_LEFT_OVERRIDE}Lima`)).toBe(
      "Maria Lima",
    );
    expect(normalizeName(`Ana${NUL}${BELL} Paula${ESCAPE}`)).toBe("Ana Paula");
  });

  it("converte para NFC", () => {
    const normalized = normalizeName(`Joa${COMBINING_TILDE}o`);
    expect(normalized).toBe("João");
    expect(normalized).toBe(normalized.normalize("NFC"));
  });

  it("preserva maiúsculas, acentos e emojis compostos", () => {
    expect(normalizeName("JOSÉ da Conceição")).toBe("JOSÉ da Conceição");
    const family = [0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467]
      .map((code) => String.fromCodePoint(code))
      .join("");
    expect(family).toContain(ZWJ);
    expect(normalizeName(`Família ${family}`)).toBe(`Família ${family}`);
  });

  it("texto só com espaços fica vazio", () => {
    expect(normalizeName(`  \t ${NBSP} ${ZERO_WIDTH_SPACE}`)).toBe("");
  });
});

describe("validação", () => {
  it("vazio, no limite e longo demais (contando caracteres, não bytes)", () => {
    expect(nameProblem("")).toBe("empty");
    expect(nameProblem("a".repeat(120))).toBeNull();
    expect(nameProblem("a".repeat(121))).toBe("too_long");
    // 120 emojis ocupam 240 unidades UTF-16, mas são 120 caracteres.
    expect(nameProblem(String.fromCodePoint(0x1f600).repeat(120))).toBeNull();
  });

  it("checkName normaliza e devolve a chave", () => {
    expect(checkName("  Ana   Lima ")).toEqual({ ok: true, name: "Ana Lima", key: "ana lima" });
    expect(checkName("   ")).toEqual({ ok: false, problem: "empty" });
    expect(checkName("x".repeat(101), 100)).toEqual({ ok: false, problem: "too_long" });
  });
});

describe("chave de duplicidade", () => {
  it.each([
    "João Silva",
    "joão silva",
    "JOAO SILVA",
    "Joao   Silva",
    `joa${COMBINING_TILDE}o silva`,
  ])("%s tem a mesma chave que João Silva", (variant) => {
    expect(matchKey(normalizeName(variant))).toBe(matchKey("João Silva"));
  });

  it("caracteres de largura total", () => {
    // "Ａｎａ": as letras de largura total ficam 0xFEE0 acima das ASCII.
    const fullWidth = [0x41, 0x6e, 0x61]
      .map((code) => String.fromCodePoint(code + 0xfee0))
      .join("");
    expect(matchKey(fullWidth)).toBe("ana");
  });

  it("nomes diferentes têm chaves diferentes", () => {
    expect(matchKey("Ana Lima")).not.toBe(matchKey("Ana Lins"));
  });
});

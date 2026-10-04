import { test as base, expect } from "@playwright/test";

/**
 * `test` com uma verificação automática: qualquer violação da Content-Security-Policy ou exceção
 * não tratada na página reprova o teste, mesmo que o fluxo testado pareça ter funcionado.
 */
export const test = base.extend<{ allowCspViolations: boolean; pageGuard: undefined }>({
  /** Só para testes que provocam uma violação de propósito (ex.: tentativa de envio de dados). */
  allowCspViolations: [false, { option: true }],
  pageGuard: [
    async ({ page, allowCspViolations }, use) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        const text = message.text();
        if (message.type() === "error" && text.includes("Content Security Policy")) {
          if (!allowCspViolations) problems.push(text);
        }
      });
      page.on("pageerror", (error) => problems.push(error.message));
      await use(undefined);
      expect(problems, "violações de CSP ou exceções na página").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

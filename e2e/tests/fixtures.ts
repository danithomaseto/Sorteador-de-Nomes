import { test as base, expect } from "@playwright/test";

/**
 * `test` com uma verificação automática: qualquer violação da Content-Security-Policy ou exceção
 * não tratada na página reprova o teste, mesmo que o fluxo testado pareça ter funcionado.
 */
export const test = base.extend<{ pageGuard: undefined }>({
  pageGuard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && message.text().includes("Content Security Policy")) {
          problems.push(message.text());
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

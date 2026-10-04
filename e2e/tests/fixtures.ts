import { test as base, expect, type Page } from "@playwright/test";

/**
 * `test` com uma verificação automática: qualquer violação da Content-Security-Policy ou exceção
 * não tratada na página (ou nas janelas que ela abrir) reprova o teste, mesmo que o fluxo testado
 * pareça ter funcionado.
 */
export const test = base.extend<{ allowCspViolations: boolean; pageGuard: undefined }>({
  /** Só para testes que provocam uma violação de propósito (ex.: tentativa de envio de dados). */
  allowCspViolations: [false, { option: true }],
  pageGuard: [
    async ({ context, page, allowCspViolations }, use) => {
      const problems: string[] = [];
      const guard = (target: Page) => {
        target.on("console", (message) => {
          const text = message.text();
          if (message.type() === "error" && text.includes("Content Security Policy")) {
            if (!allowCspViolations) problems.push(text);
          }
        });
        target.on("pageerror", (error) => problems.push(error.message));
      };
      guard(page);
      // Janelas abertas pelo site (ex.: o telão) passam pela mesma verificação.
      context.on("page", guard);
      await use(undefined);
      expect(problems, "violações de CSP ou exceções na página").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

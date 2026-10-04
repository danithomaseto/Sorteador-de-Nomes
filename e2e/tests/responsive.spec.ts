import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectAccessible, openDraw, pasteNames, people } from "./helpers";

// Nomes reais podem ser longos e sem espaços (sobrenomes compostos com hífen, apelidos colados).
const LONG_NAMES = [
  "Maria Aparecida dos Santos Albuquerque de Oliveira Figueiredo",
  "Maximiliano-Bartolomeu-Fernandes-Albuquerque-Vasconcelos",
];

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

for (const width of [320, 768]) {
  test.describe(`largura de ${String(width)}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const path of ["/", "/como-funciona", "/privacidade"]) {
      test(`${path} sem rolagem horizontal`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      });
    }

    test("sorteio, resultado e apresentação sem rolagem horizontal", async ({ page }) => {
      await openDraw(page);
      await pasteNames(page, [...LONG_NAMES, ...people(6)]);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      await expectAccessible(page);

      await page.getByRole("button", { name: "Sortear 1" }).first().click();
      await expect(page.getByText("Vencedor", { exact: true })).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

      await page.getByRole("link", { name: "Voltar aos participantes" }).click();
      await page.getByRole("link", { name: "Apresentar em tela cheia" }).click();
      await expect(page.getByText("Preparado?")).toBeVisible();
      await page.keyboard.press("Space");
      await expect(page.getByText("Parabéns!", { exact: true })).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  });
}

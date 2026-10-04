import { expect, test } from "./fixtures";
import { expectAccessible, openDraw, pasteNames, people } from "./helpers";

test("celular: adicionar, sortear pela barra fixa e ver o resultado", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(12));
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);

  await page
    .getByRole("region", { name: "Sortear rapidamente" })
    .getByRole("button", { name: "Sortear 1" })
    .click();
  await expect(page.getByText("Vencedor", { exact: true })).toBeVisible();
  await expectAccessible(page);
});

test("celular: landing sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

import { expect, test } from "./fixtures";
import { openDraw, pasteNames, participantCount, people } from "./helpers";

test("lista com 10 mil nomes continua leve", async ({ page }) => {
  test.slow();
  await openDraw(page);
  await pasteNames(page, people(10_000));
  expect(await participantCount(page)).toBe("10.000");

  // Virtualização: só as linhas visíveis existem no DOM.
  const rendered = await page
    .getByRole("region", { name: "Lista de participantes" })
    .getByRole("listitem")
    .count();
  expect(rendered).toBeLessThan(80);

  await page.getByPlaceholder("Filtrar por nome").fill("Pessoa 09999");
  await expect(page.getByText("1 de 10.000")).toBeVisible();

  await page.getByRole("radio", { name: "10", exact: true }).check();
  await page.getByRole("button", { name: "Sortear 10" }).click();
  await expect(page.getByRole("article").getByRole("listitem")).toHaveCount(10);
});

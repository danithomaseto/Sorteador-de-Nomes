import { expect, test } from "./fixtures";
import { expectAccessible, openDraw, pasteNames, people } from "./helpers";

test("modo apresentação: sortear pelo teclado e sair", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(8));
  await page.getByRole("link", { name: "Apresentar em tela cheia" }).click();
  await expect(page.getByText("Preparado?")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectAccessible(page);

  await page.keyboard.press("Space");
  await expect(page.getByText("Parabéns!", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sortear novamente" })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expectAccessible(page);

  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/sorteio$/);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  await expect(page.getByRole("link", { name: /Rodada 1/ })).toBeVisible();
});

test.describe("com animação", () => {
  test.use({ reducedMotion: "no-preference" });

  test("a animação pode ser pulada e termina no vencedor registrado", async ({ page }) => {
    await openDraw(page);
    await pasteNames(page, people(20));
    await page.getByRole("button", { name: "Sortear 1" }).click();
    await page.getByRole("button", { name: "Pular animação" }).click();
    const winner = await page
      .getByText("Vencedor", { exact: true })
      .locator("xpath=following-sibling::p[1]")
      .textContent();
    expect(winner).toMatch(/^Pessoa \d{2}$/);
    await page.getByRole("link", { name: "Voltar aos participantes" }).click();
    await expect(page.getByText(`Sorteado na rodada 1`)).toHaveCount(1);
  });
});

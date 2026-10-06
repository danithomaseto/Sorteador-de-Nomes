import { expect, test } from "./fixtures";
import { openDraw, pasteNames, people } from "./helpers";

test.describe("notebook (1366 × 768)", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("área do sorteio: sem rolagem dupla e com Sortear sempre visível", async ({ page }) => {
    await openDraw(page);
    await pasteNames(page, people(500));

    // A página não rola; a lista rola por dentro, em colunas.
    const pageScroll = await page.evaluate(
      () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
    );
    expect(pageScroll).toBeLessThanOrEqual(0);
    const list = page.getByRole("region", { name: "Lista de participantes" });
    const scrollable = await list.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    );
    expect(scrollable).toBe(true);
    const firstRow = await list.getByText("Pessoa 001", { exact: true }).boundingBox();
    const secondRow = await list.getByText("Pessoa 002", { exact: true }).boundingBox();
    expect(secondRow?.y).toBe(firstRow?.y); // lado a lado, na mesma linha

    await expect(page.getByRole("button", { name: "Sortear 1" })).toBeInViewport();
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(list.getByText("Pessoa 500", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sortear 1" })).toBeInViewport();
  });
});

test.describe("com animação", () => {
  test.use({ reducedMotion: "no-preference" });

  test("vários vencedores: as roletas giram juntas e param nos vencedores", async ({ page }) => {
    await openDraw(page);
    await pasteNames(page, people(40));
    await page.getByRole("radio", { name: "10", exact: true }).check({ force: true });
    await page.getByRole("button", { name: "Sortear 10" }).click();
    await expect(page.getByText("Sorteando 10 vencedores…", { exact: true })).toBeVisible();
    // Todas as roletas param e o resultado aparece no mesmo palco.
    await expect(page.getByText("Vencedores", { exact: true })).toBeVisible({ timeout: 8000 });
    const winners = page.getByRole("region", { name: "Vencedores" }).getByRole("listitem");
    await expect(winners).toHaveCount(10, { timeout: 8000 });
    await expect(winners.first()).toContainText(/^1º\s*Pessoa \d{2}$/);
  });
});

import { expect, test } from "./fixtures";

test.describe("com animação", () => {
  test.use({ reducedMotion: "no-preference" });

  test("página inicial: as roletas giram e trocam de rodada; seções entram ao rolar", async ({
    page,
  }) => {
    await page.goto("/");
    const stage = page.locator("figure").first();
    await expect(stage.getByText("Rodada 1 · 10 de 127")).toBeVisible();
    await expect(stage.getByText("Sorteando…")).toBeVisible();
    await expect(stage.getByText("Rodada 2 · 10 de 127")).toBeVisible();
    await expect(stage.getByText("Vencedores", { exact: true })).toBeVisible({ timeout: 6000 });

    // Abaixo da dobra, os blocos começam pendentes e entram ao chegar na tela.
    const bento = page.getByRole("heading", { name: "Tudo o que um sorteio pede." });
    await expect(page.locator(".reveal-pending").first()).toBeAttached();
    await bento.scrollIntoViewIfNeeded();
    await expect(bento).toBeVisible();
    await expect(page.getByText("50.000", { exact: true }).first()).toBeVisible({ timeout: 4000 });
  });

  test("como funciona: a demonstração sorteia e o sumário acompanha a rolagem", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/como-funciona");
    const toc = page.getByRole("navigation", { name: "Nesta página" });
    await toc.getByRole("link", { name: "O método" }).click();
    await expect(page).toHaveURL(/#metodo$/);
    await expect(toc.getByRole("link", { name: "O método" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    const demo = page.getByRole("group", { name: "Demonstração do método" });
    await expect(demo.getByText(/^Vencedores: /)).toBeVisible({ timeout: 10000 });
    await expect(demo.getByRole("button", { name: "Sortear de novo" })).toBeEnabled();
    await demo.getByRole("button", { name: "Sortear de novo" }).click();
    await expect(demo.getByRole("button", { name: "Sortear de novo" })).toBeDisabled();
    await expect(demo.getByText(/^Vencedores: /)).toBeVisible({ timeout: 10000 });
  });
});

test("com 'reduzir movimento', nada fica escondido nem gira", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  await expect(page.locator(".reveal-pending")).toHaveCount(0);
  const stage = page.locator("figure").first();
  await expect(stage.getByText("Rodada 1 · 10 de 127")).toBeVisible();
  await expect(stage.getByText("Vencedores", { exact: true })).toBeVisible();
});

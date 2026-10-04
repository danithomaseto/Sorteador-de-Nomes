import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectAccessible, openDraw, pasteNames, people } from "./helpers";

async function openPresentationWithScreen(
  page: Page,
  context: BrowserContext,
  names: string[],
): Promise<Page> {
  await openDraw(page);
  await pasteNames(page, names);
  await page.getByRole("link", { name: "Apresentar em tela cheia" }).click();
  await expect(page.getByText("Preparado?")).toBeVisible();
  const [screen] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("button", { name: "Abrir telão" }).click(),
  ]);
  await expect(screen).toHaveURL(/\/sorteio\/telao#[0-9a-f]{16}$/);
  await expect(page.getByRole("status").filter({ hasText: "Telão conectado" })).toBeVisible();
  return screen;
}

function winnerAfterCongrats(target: Page) {
  return target.getByText("Parabéns!", { exact: true }).locator("xpath=following-sibling::p[1]");
}

test("telão: outra janela acompanha o modo apresentação", async ({ page, context }) => {
  const requests: string[] = [];
  context.on("request", (request) => {
    if (request.method() !== "GET") requests.push(`${request.method()} ${request.url()}`);
  });
  const screen = await openPresentationWithScreen(page, context, people(8));

  await expect(screen.getByText("Preparado?")).toBeVisible();
  await expect(screen.getByRole("heading", { name: /^Telão: Sorteio de/ })).toBeAttached();
  await expect(screen.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectAccessible(screen);

  // Sorteia pela janela principal: o telão mostra o mesmo vencedor.
  await page.keyboard.press("Space");
  await expect(winnerAfterCongrats(page)).toHaveText(/^Pessoa \d$/);
  const winner = (await winnerAfterCongrats(page).textContent()) ?? "";
  await expect(winnerAfterCongrats(screen)).toHaveText(winner);
  await expectAccessible(screen);

  // O tema acompanha.
  await page.getByRole("button", { name: "Tema claro" }).click();
  await expect(screen.locator("html")).toHaveAttribute("data-theme", "light");

  // Espaço no telão avança o sorteio na janela principal.
  await screen.keyboard.press("Space");
  await expect(page.getByText("2 rodadas")).toBeVisible();

  // Sair da apresentação pausa o telão, que fica só com o nome do sorteio.
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(screen.getByText("Apresentação pausada")).toBeVisible();
  await expect(screen.getByText("Parabéns!", { exact: true })).toBeHidden();

  // Voltar à apresentação reconecta o mesmo telão.
  await page.getByRole("link", { name: "Apresentar em tela cheia" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Telão conectado" })).toBeVisible();
  await expect(screen.getByText("Apresentação pausada")).toBeHidden();
  await expect(screen.getByText("Preparado?")).toBeVisible();

  // Fechar o telão: o botão volta a aparecer.
  await screen.close();
  await expect(page.getByRole("button", { name: "Abrir telão" })).toBeVisible();

  // Tudo pelo próprio navegador: nenhuma requisição além de baixar o site.
  expect(requests).toEqual([]);
});

test.describe("com animação", () => {
  test.use({ reducedMotion: "no-preference" });

  test("o telão gira o rolo junto, sem o botão de pular", async ({ page, context }) => {
    const screen = await openPresentationWithScreen(page, context, people(20));
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Pular animação" })).toBeVisible();
    await expect(screen.getByText("Sorteando…").first()).toBeVisible();
    await expect(screen.getByRole("button", { name: "Pular animação" })).toHaveCount(0);

    // Pular na janela principal encerra o rolo nas duas telas.
    await page.getByRole("button", { name: "Pular animação" }).click();
    const winner = (await winnerAfterCongrats(page).textContent()) ?? "";
    expect(winner).toMatch(/^Pessoa \d{2}$/);
    await expect(winnerAfterCongrats(screen)).toHaveText(winner);
  });
});

test("telão aberto sem a apresentação explica como conectar", async ({ page }) => {
  await page.goto("/sorteio/telao");
  await expect(page.getByText("Telão sem conexão")).toBeVisible();
  await expectAccessible(page);
});

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

test("celular: seções em abas; a lista rola com a página", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(80));
  const tabs = page.getByRole("tablist", { name: "Seções do sorteio" });
  await expect(tabs.getByRole("tab", { name: "Participantes 80" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // Sem área de rolagem presa: rolar a página mostra o fim da lista.
  await page.mouse.wheel(0, 6000);
  await expect(page.getByText("Pessoa 80", { exact: true })).toBeVisible();
  // As abas continuam à mão.
  await expect(tabs).toBeInViewport();

  await tabs.getByRole("tab", { name: "Regras" }).click();
  await page.getByRole("radio", { name: "3", exact: true }).check({ force: true });
  await expect(
    page.getByRole("region", { name: "Sortear rapidamente" }).getByRole("button"),
  ).toHaveText("Sortear 3");
  await expectAccessible(page);

  await tabs.getByRole("tab", { name: "Histórico" }).click();
  await expect(page.getByText("Nenhuma rodada ainda.", { exact: false })).toBeVisible();
});

test("celular: landing sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

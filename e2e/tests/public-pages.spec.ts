import { expect, test } from "./fixtures";
import { expectAccessible, trackErrors } from "./helpers";

test("landing apresenta o produto e leva ao sorteio", async ({ page }) => {
  const errors = trackErrors(page);
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("script-src 'self' 'sha256-");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Sorteios simples\.\s*Resultados justos\./,
  );
  await expect(page.getByText("Não armazenamos sua lista de participantes").first()).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("link", { name: "Criar sorteio" }).first().click();
  await expect(page).toHaveURL(/\/sorteio$/);
  expect(errors).toEqual([]);
});

for (const [path, title] of [
  ["/como-funciona", "Como funciona o sorteio"],
  ["/privacidade", "Privacidade e termos de uso"],
] as const) {
  test(`página ${path} carrega sem erros e é acessível`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expectAccessible(page);
    expect(errors).toEqual([]);
  });
}

test("como funciona deixa claro que não há IA", async ({ page }) => {
  await page.goto("/como-funciona");
  await expect(page.getByText("Nenhuma inteligência artificial escolhe")).toBeVisible();
});

test("tema escuro da landing é acessível", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectAccessible(page);
});

test("endereço inexistente mostra página amigável", async ({ page }) => {
  await page.goto("/nao-existe");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});

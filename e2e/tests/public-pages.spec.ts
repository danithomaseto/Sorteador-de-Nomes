import { expect, test } from "./fixtures";
import { expectAccessible, trackErrors } from "./helpers";

test("landing apresenta o produto e leva ao sorteio", async ({ page }) => {
  const errors = trackErrors(page);
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(csp).toContain("script-src 'self' 'sha256-");
  expect(csp).toContain("connect-src 'none'");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sorteio de nomes, da planilha ao telão.",
  );
  await expect(page.getByText(/armazenamos sua lista de participantes/).first()).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og\.png$/);
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
  const summary = page.getByRole("complementary", { name: "Em resumo" });
  await expect(summary.getByText("Inteligência artificial", { exact: true })).toBeVisible();
  await expect(summary.getByText(/^Nenhuma\. Quem escolhe é o gerador aleatório/)).toBeVisible();
});

test("sumário das páginas de texto leva à seção", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/como-funciona");
  const toc = page.getByRole("navigation", { name: "Nesta página" });
  await toc.getByRole("link", { name: "Garantias e limites" }).click();
  await expect(page).toHaveURL(/#garantias$/);
  await expect(page.getByRole("heading", { name: "Garantias e limites" })).toBeInViewport();
  await expect(toc.getByRole("link", { name: "Garantias e limites" })).toHaveAttribute(
    "aria-current",
    "location",
  );
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

test("sumário acompanha a rolagem até a última seção", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/como-funciona");
  const toc = page.getByRole("navigation", { name: "Nesta página" });
  const current = toc.locator('[aria-current="location"]');
  await expect(current).toHaveText("Passo a passo");

  await page.getByRole("heading", { name: "Garantias e limites" }).evaluate((heading) => {
    window.scrollTo(0, heading.getBoundingClientRect().top + window.scrollY - 120);
  });
  await expect(current).toHaveText("Garantias e limites");

  // No fim da página, a última seção fica marcada (ela nunca chega ao topo da tela).
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect(current).toHaveText("Seus dados");

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(current).toHaveText("Passo a passo");
});

test("rodapé credita o autor e leva ao Instagram em nova aba", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText(/Sorteio360 · Daniel Thomaseto/)).toBeVisible();
  const instagram = footer.getByRole("link", {
    name: "Instagram de Daniel Thomaseto (abre em nova aba)",
  });
  await expect(instagram).toHaveAttribute("href", "https://www.instagram.com/danithomaseto/");
  await expect(instagram).toHaveAttribute("target", "_blank");
  await expect(instagram).toHaveAttribute("rel", /noopener/);
});

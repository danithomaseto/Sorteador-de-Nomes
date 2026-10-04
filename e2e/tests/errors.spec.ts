import { expect, test } from "./fixtures";
import { openDraw, pasteNames } from "./helpers";

test("sem conexão ao sortear: mensagem amigável e nada registrado", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, ["Ana", "Bia", "Caio"]);
  await page.route("**/api/v1/rounds", (route) => route.abort("internetdisconnected"));
  await page.getByRole("button", { name: "Sortear 1" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Não foi possível sortear" });
  await expect(alert).toContainText("Sem conexão com o servidor");
  await expect(alert).toContainText("Nenhum resultado foi registrado");
  await expect(page.getByRole("link", { name: /Rodada 1/ })).toHaveCount(0);
});

test("arquivo de outro tipo é recusado com explicação", async ({ page }) => {
  await openDraw(page);
  await page.getByRole("button", { name: "Importar planilha" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "contrato.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7"),
  });
  await expect(
    page.getByText("Envie uma planilha do Excel (.xlsx) ou um arquivo .csv."),
  ).toBeVisible();
});

test("planilha corrompida mostra erro amigável", async ({ page }) => {
  await openDraw(page);
  await page.getByRole("button", { name: "Importar planilha" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "lista.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("isto não é uma planilha"),
  });
  await expect(page.getByRole("alert")).toContainText("Não foi possível ler a planilha");
  await expect(page.getByText(/Error|Traceback|undefined/)).toHaveCount(0);
});

test("nome longo demais é explicado", async ({ page }) => {
  await openDraw(page);
  await page.getByLabel("Nome do participante").fill("x".repeat(130));
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByText("O nome pode ter no máximo 120 caracteres.")).toBeVisible();
});

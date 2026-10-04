import { expect, test } from "./fixtures";
import { chooseFile, openDraw } from "./helpers";

test("arquivo de outro tipo é recusado com explicação", async ({ page }) => {
  await openDraw(page);
  await chooseFile(page, {
    name: "contrato.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7"),
  });
  await expect(
    page.getByText("Use uma planilha do Excel (.xlsx ou .xls) ou um arquivo .csv."),
  ).toBeVisible();
});

test("PDF renomeado para .csv é reconhecido pelo conteúdo", async ({ page }) => {
  await openDraw(page);
  await chooseFile(page, {
    name: "lista.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("%PDF-1.7 conteúdo"),
  });
  await expect(page.getByRole("alert")).toContainText("Este arquivo é um PDF.");
});

test("planilha corrompida mostra erro amigável", async ({ page }) => {
  await openDraw(page);
  await chooseFile(page, {
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

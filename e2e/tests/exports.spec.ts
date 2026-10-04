import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { openDraw, pasteNames } from "./helpers";

async function drawOne(page: Page) {
  await openDraw(page);
  await pasteNames(page, ["Ana Lima", "Bruno Costa", "Carla Dias"]);
  await page.getByRole("button", { name: "Sortear 1" }).click();
  await expect(page.getByText("Parabéns!", { exact: true })).toBeVisible();
}

async function download(page: Page, option: string): Promise<{ name: string; bytes: Buffer }> {
  await page.getByRole("button", { name: "Exportar" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: option }).click();
  const file = await pending;
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path()) ?? "") };
}

test("exporta TXT, CSV, Excel e imagem, tudo gerado no navegador", async ({ page }) => {
  await drawOne(page);
  const winner = await page
    .locator("p", { hasText: /^(Ana Lima|Bruno Costa|Carla Dias)$/ })
    .first()
    .textContent();

  const txt = await download(page, "Texto (.txt)");
  expect(txt.name).toMatch(/-rodada-1\.txt$/);
  expect(txt.bytes.toString("utf8")).toContain(`1º  ${winner ?? ""}`);

  const csv = await download(page, "CSV (.csv)");
  expect(csv.bytes.toString("utf8")).toContain(`;1;${winner ?? ""};Não;Sim;3;3`);

  const xlsx = await download(page, "Excel (.xlsx)");
  expect(xlsx.bytes.subarray(0, 2).toString()).toBe("PK");

  const png = await download(page, "Imagem (.png)");
  expect(png.name).toMatch(/-rodada-1\.png$/);
  expect(png.bytes.subarray(1, 4).toString()).toBe("PNG");
  // Dimensões no cabeçalho IHDR: 1200 × 675 desenhados em 2×.
  expect([png.bytes.readUInt32BE(16), png.bytes.readUInt32BE(20)]).toEqual([2400, 1350]);
});

test("PDF ou impressão: abre a impressão do navegador só com o resultado", async ({ page }) => {
  await drawOne(page);
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printed = "sim";
    };
  });
  await page.getByRole("button", { name: "Exportar" }).click();
  await page.getByRole("button", { name: "PDF ou impressão" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "sim");

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByRole("button", { name: /Sortear novamente/ })).toBeHidden();
  await expect(page.getByText("Rodada realizada no navegador")).toBeVisible();
  await expect(page.getByText("Parabéns!", { exact: true })).toBeVisible();
});

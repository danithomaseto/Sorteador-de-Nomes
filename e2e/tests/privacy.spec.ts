import { expect, test } from "./fixtures";
import { chooseFile, openDraw, pasteNames } from "./helpers";

test("importar, sortear e exportar sem nenhuma requisição além dos arquivos do site", async ({
  page,
  context,
  baseURL,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    requests.push(`${request.method()} ${request.url()}`);
  });

  await openDraw(page);
  await pasteNames(page, ["Fulana Sigilosa", "Beltrano Reservado", "Ciclana Discreta"]);
  await chooseFile(page, "fixtures/participantes.xlsx");
  await page.getByRole("button", { name: /^Adicionar \d+ participantes$/ }).click();
  await page.getByRole("button", { name: "Sortear 1" }).click();
  await expect(page.getByText("Parabéns!")).toBeVisible();
  await page.getByRole("button", { name: "Exportar" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV (.csv)" }).click();
  await download;

  // Só GETs de arquivos do próprio site (páginas, scripts, estilos, fontes, ícones, Worker).
  const unexpected = requests.filter(
    (entry) => !entry.startsWith(`GET ${baseURL ?? ""}/`) && !entry.startsWith("GET blob:"),
  );
  expect(unexpected).toEqual([]);
  expect(requests.join("\n")).not.toContain("Fulana");

  const storage = await page.evaluate(async () => ({
    local: window.localStorage.length,
    session: window.sessionStorage.length,
    databases: (await indexedDB.databases()).length,
    cookie: document.cookie,
  }));
  expect(storage).toEqual({ local: 0, session: 0, databases: 0, cookie: "" });
  expect(await context.cookies()).toEqual([]);
});

test.describe("política de segurança", () => {
  test.use({ allowCspViolations: true });

  test("o navegador recusa qualquer envio de dados (connect-src 'none')", async ({ page }) => {
    await page.goto("/sorteio");
    const blocked = await page.evaluate(async () => {
      try {
        await fetch("/robots.txt", { method: "POST", body: "Fulana Sigilosa" });
        return false;
      } catch {
        return true;
      }
    });
    expect(blocked).toBe(true);
  });
});

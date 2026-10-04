import { expect, test } from "./fixtures";
import { openDraw, pasteNames } from "./helpers";

test("nada é guardado no navegador e o sorteio não envia nomes", async ({ page, context }) => {
  const roundRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v1/rounds")) roundRequests.push(request.postData() ?? "");
  });

  await openDraw(page);
  await pasteNames(page, ["Fulana Sigilosa", "Beltrano Reservado", "Ciclana Discreta"]);
  await page.getByRole("button", { name: "Sortear 1" }).click();
  await expect(page.getByText("Vencedor", { exact: true })).toBeVisible();

  expect(roundRequests).toHaveLength(1);
  expect(JSON.parse(roundRequests[0] ?? "{}")).toEqual({
    pool_size: 3,
    quantity: 1,
    allow_repeat: false,
  });
  expect(roundRequests[0]).not.toContain("Fulana");

  const storage = await page.evaluate(async () => ({
    local: window.localStorage.length,
    session: window.sessionStorage.length,
    databases: (await indexedDB.databases()).length,
    cookie: document.cookie,
  }));
  expect(storage).toEqual({ local: 0, session: 0, databases: 0, cookie: "" });
  expect(await context.cookies()).toEqual([]);
});

test("respostas da API não são guardadas em cache", async ({ request }) => {
  const response = await request.get("/api/v1/limits");
  expect(response.headers()["cache-control"]).toBe("no-store");
});

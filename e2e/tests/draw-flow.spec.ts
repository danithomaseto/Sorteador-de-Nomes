import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures";
import {
  addName,
  chooseFile,
  expectAccessible,
  openDraw,
  participantCount,
  pasteNames,
  people,
  trackErrors,
} from "./helpers";

test("fluxo completo: adicionar, colar, sortear, exportar e copiar", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors = trackErrors(page);
  await openDraw(page);
  await expectAccessible(page);

  await addName(page, "Maria Souza");
  await addName(page, "  joão   silva ");
  await expect(page.getByText("joão silva", { exact: true })).toBeVisible();
  await pasteNames(page, people(10));
  expect(await participantCount(page)).toBe("12");
  await expectAccessible(page);

  await page.getByRole("radio", { name: "3", exact: true }).check();
  await page.getByRole("button", { name: "Sortear 3" }).click();
  await expect(page).toHaveURL(/\/sorteio\/rodadas\/1$/);
  await expect(page.getByRole("heading", { name: "Resultado · Rodada 1" })).toBeVisible();
  await expect(page.getByRole("article").getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText("Disponíveis depois")).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Exportar" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel (.xlsx)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/-rodada-1\.xlsx$/);
  const file = await readFile((await download.path()) ?? "");
  expect(file.subarray(0, 2).toString()).toBe("PK");

  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  await expect(page.getByText("Resultado copiado.")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Rodada 1");
  expect(copied.split("\n").filter((line) => /^\dº /.test(line))).toHaveLength(3);

  await page.getByRole("link", { name: "Voltar aos participantes" }).click();
  await expect(page.getByRole("link", { name: /Rodada 1/ })).toBeVisible();
  await expect(page.getByText("9", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("importar planilha .xlsx escolhendo a coluna", async ({ page }) => {
  await openDraw(page);
  await chooseFile(page, "fixtures/participantes.xlsx");
  await expect(page.getByText("19 participantes encontrados")).toBeVisible();
  await expect(page.getByLabel("Aba da planilha")).toHaveValue("0");
  await expect(page.getByText("1 nome aparece mais de uma vez")).toBeVisible();
  await expectAccessible(page);

  await page
    .getByLabel("Qual coluna contém os participantes?")
    .selectOption({ label: "Matrícula (coluna B)" });
  await expect(page.getByText("20 participantes encontrados")).toBeVisible();
  await page
    .getByLabel("Qual coluna contém os participantes?")
    .selectOption({ label: "Nome (coluna A)" });
  await expect(page.getByText("19 participantes encontrados")).toBeVisible();

  // Repetidos ficam de fora por padrão ("joão silva" repete "João Silva").
  await expect(page.getByText("1 nome duplicado será ignorado")).toBeVisible();
  await page.getByRole("button", { name: "Adicionar 18 participantes" }).click();
  expect(await participantCount(page)).toBe("18");
  await expect(page.getByText("1 nome duplicado foi ignorado")).toBeVisible();
});

test("importar planilha antiga .xls (Excel 97–2003)", async ({ page }) => {
  await openDraw(page);
  await chooseFile(page, "fixtures/participantes.xls");
  await expect(page.getByText("11 participantes encontrados")).toBeVisible();
  await expect(page.getByLabel("Aba da planilha")).toHaveValue("0");
  await expect(page.getByRole("cell", { name: "Conceição Araújo" })).toBeVisible();
  await page.getByRole("radio", { name: "Manter todos" }).check();
  await page.getByRole("button", { name: "Adicionar 11 participantes" }).click();
  expect(await participantCount(page)).toBe("11");
  await expect(page.getByText(/têm nome repetido/)).toBeVisible();
});

test("importar CSV do Excel (Windows-1252, ponto e vírgula)", async ({ page }) => {
  await openDraw(page);
  await chooseFile(page, "fixtures/participantes.csv");
  await expect(page.getByText("15 participantes encontrados")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Conceição Araújo" })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar 15 participantes" }).click();
  await expect(page.getByText("Conceição Araújo")).toBeVisible();
});

test("repetidos ao colar: ignorados por padrão, mantidos se a pessoa quiser", async ({ page }) => {
  await openDraw(page);
  await addName(page, "Ana Lima");
  await pasteNames(page, ["ana lima", "Bia Souza", "Bia Souza", "Caio Reis"]);
  expect(await participantCount(page)).toBe("3");
  await pasteNames(page, ["Davi Melo", "Davi Melo"], { keepRepeated: true });
  expect(await participantCount(page)).toBe("5");
});

test("nome digitado que já está na lista pede confirmação", async ({ page }) => {
  await openDraw(page);
  await addName(page, "Ana Lima");
  await page.getByLabel("Nome do participante").fill("ANA  LIMA");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByText("“Ana Lima” já está na lista.", { exact: false })).toBeVisible();
  expect(await participantCount(page)).toBe("1");
  await page.getByRole("button", { name: "Adicionar mesmo assim" }).click();
  expect(await participantCount(page)).toBe("2");
});

test("quantidade maior que a lista bloqueia o sorteio com explicação", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(3));
  await page.getByRole("radio", { name: "5", exact: true }).check();
  await expect(
    page
      .getByText("Não é possível sortear 5 vencedores com apenas 3 participantes disponíveis")
      .first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sortear 5" })).toBeDisabled();

  await page.getByRole("switch", { name: "Permitir repetir na mesma rodada" }).check();
  await page.getByRole("button", { name: "Sortear 5" }).click();
  await expect(page.getByRole("article").getByRole("listitem")).toHaveCount(5);
});

test("quantidade personalizada", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(40));
  await page.getByRole("radio", { name: "Outro" }).check();
  await page.getByLabel("Quantidade personalizada").fill("0");
  await expect(page.getByText("Informe um número inteiro a partir de 1.").first()).toBeVisible();
  await page.getByLabel("Quantidade personalizada").fill("25");
  await page.getByRole("button", { name: "Sortear 25" }).click();
  await expect(page.getByRole("article").getByRole("listitem")).toHaveCount(25);
});

test("todos sorteados: restaurar participantes", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, ["Ana", "Bia"]);
  await page.getByRole("button", { name: "Sortear 1" }).click();
  await expect(page.getByText("Vencedor", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Sortear novamente/ }).click();
  await expect(page).toHaveURL(/rodadas\/2$/);
  await expect(page.getByText("Todos os participantes já foram sorteados").first()).toBeVisible();

  await page.getByRole("link", { name: "Voltar aos participantes" }).click();
  await page.getByRole("button", { name: "Restaurar participantes" }).click();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByText("Todos os participantes estão disponíveis de novo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sortear 1" })).toBeEnabled();
});

test("editar e excluir com desfazer", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, ["Ana", "Bia", "Caio"]);
  await page.getByRole("button", { name: "Editar Bia" }).click();
  await page.getByRole("dialog").getByLabel("Nome").fill("Beatriz Souza");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Beatriz Souza")).toBeVisible();

  await page.getByRole("button", { name: "Excluir Caio" }).click();
  expect(await participantCount(page)).toBe("2");
  await page.getByRole("button", { name: "Desfazer" }).click();
  expect(await participantCount(page)).toBe("3");
});

test("revelação um a um", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(6));
  await page.getByRole("radio", { name: "Um a um" }).check();
  await page.getByRole("radio", { name: "3", exact: true }).check();
  await page.getByRole("button", { name: "Sortear 3" }).click();
  await expect(page.getByRole("article").getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Revelar próximo (2 de 3)" }).click();
  await expect(page.getByRole("article").getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Revelar todos" }).click();
  await expect(page.getByRole("article").getByRole("listitem")).toHaveCount(3);
});

test("recarregar a página descarta a sessão", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(4));
  await page.getByRole("button", { name: "Sortear 1" }).click();
  await expect(page).toHaveURL(/rodadas\/1$/);
  page.on("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Este resultado não está mais disponível" }),
  ).toBeVisible();
});

test("reiniciar sorteio apaga os resultados e mantém a lista", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(4));
  await page.getByRole("button", { name: "Sortear 1" }).click();
  await page.getByRole("link", { name: "Voltar aos participantes" }).click();
  await expect(page.getByText("Sorteado na rodada 1")).toHaveCount(1);
  await page.getByRole("button", { name: "Reiniciar sorteio" }).click();
  await page.getByRole("button", { name: "Apagar resultados e reiniciar" }).click();
  await expect(page.getByText("Sorteado na rodada 1")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Rodada 1/ })).toHaveCount(0);
  expect(await participantCount(page)).toBe("4");
});

test("novo sorteio pede confirmação e descarta a lista", async ({ page }) => {
  await openDraw(page);
  await pasteNames(page, people(3));
  await page.getByRole("button", { name: "Novo sorteio" }).click();
  await expect(page.getByRole("dialog", { name: "Começar um novo sorteio?" })).toBeVisible();
  await page.getByRole("button", { name: "Descartar e começar" }).click();
  expect(await participantCount(page)).toBe("0");
});

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Coleta erros do console (inclui violações de CSP) e exceções da página. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function openDraw(page: Page): Promise<void> {
  await page.goto("/sorteio");
  await expect(page.getByRole("heading", { name: /^Participantes/ })).toBeVisible();
}

export async function addName(page: Page, name: string): Promise<void> {
  await page.getByLabel("Nome do participante").fill(name);
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByLabel("Nome do participante")).toHaveValue("");
}

/**
 * Cola a lista no diálogo. Listas grandes entram como uma colagem real (um único evento de
 * entrada): o `fill` do Playwright simula a digitação linha a linha e fica quadrático.
 */
export async function pasteNames(
  page: Page,
  names: string[],
  options: { skipRepeated?: boolean } = {},
) {
  await page.getByRole("button", { name: "Colar lista" }).click();
  const textarea = page.getByLabel("Nomes");
  if (names.length > 200) {
    await textarea.evaluate((element, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }, names.join("\n"));
  } else {
    await textarea.fill(names.join("\n"));
  }
  await page.getByRole("button", { name: "Revisar lista" }).click();
  if (options.skipRepeated) await page.getByRole("radio", { name: "Ignorar repetidos" }).check();
  await page.getByRole("button", { name: /^Adicionar \d/ }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

export function people(count: number, prefix = "Pessoa"): string[] {
  return Array.from(
    { length: count },
    (_, i) => `${prefix} ${String(i + 1).padStart(String(count).length, "0")}`,
  );
}

export async function participantCount(page: Page): Promise<string> {
  const heading = await page.getByRole("heading", { name: /^Participantes/ }).textContent();
  return (heading ?? "").replace("Participantes", "").trim();
}

export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? "?"}): ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
  expect(violations).toEqual([]);
}

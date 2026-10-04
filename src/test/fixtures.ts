import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Planilha de teste de `src/services/import/__fixtures__` (geradas sem dados reais de pessoas). */
export function fixture(name: string): Uint8Array {
  return new Uint8Array(
    readFileSync(join(process.cwd(), "src/services/import/__fixtures__", name)),
  );
}

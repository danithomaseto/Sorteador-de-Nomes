/**
 * Leitura de arquivos ZIP (o contêiner do .xlsx) com limites.
 *
 * O tamanho descompactado declarado de cada arquivo interno é verificado antes de qualquer
 * descompressão, e o `fflate` usa esse tamanho como buffer fixo de saída: um arquivo que mente
 * o tamanho (zip bomb) nunca aloca mais memória que o declarado.
 */
import { unzipSync, type UnzipFileInfo } from "fflate";
import { LIMITS } from "~/config";
import { ImportError } from "./errors";

const MAX_ENTRIES = 10_000;

export interface ZipEntry {
  readonly name: string;
  readonly size: number;
}

export class ZipArchive {
  private readonly entries: ReadonlyMap<string, ZipEntry>;

  constructor(private readonly bytes: Uint8Array) {
    const entries = new Map<string, ZipEntry>();
    let total = 0;
    try {
      unzipSync(bytes, {
        filter: (file: UnzipFileInfo) => {
          if (entries.size >= MAX_ENTRIES) throw new ImportError("spreadsheet_too_large");
          entries.set(file.name, { name: file.name, size: file.originalSize });
          total += file.originalSize;
          return false; // só lista; nada é descompactado aqui
        },
      });
    } catch (error) {
      if (error instanceof ImportError) throw error;
      throw new ImportError("invalid_spreadsheet");
    }
    if (total > LIMITS.maxUncompressedBytes) throw new ImportError("spreadsheet_too_large");
    this.entries = entries;
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  /** Conteúdo de um arquivo interno, como texto UTF-8; `null` se não existir. */
  text(name: string): string | null {
    if (!this.entries.has(name)) return null;
    let files: Record<string, Uint8Array>;
    try {
      files = unzipSync(this.bytes, { filter: (file) => file.name === name });
    } catch {
      throw new ImportError("invalid_spreadsheet");
    }
    const content = files[name];
    if (!content) throw new ImportError("invalid_spreadsheet");
    return new TextDecoder("utf-8").decode(content);
  }
}

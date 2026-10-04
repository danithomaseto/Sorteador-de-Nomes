/**
 * Leitura de arquivos "Compound File Binary" (o contêiner do .xls, também usado por .doc e por
 * planilhas criptografadas), conforme a especificação [MS-CFB].
 *
 * Só os fluxos (streams) do nível principal são lidos. Toda posição e toda cadeia de setores é
 * validada: arquivos corrompidos ou maliciosos (cadeias em ciclo, setores fora do arquivo)
 * resultam em erro, nunca em laço infinito ou leitura fora dos limites.
 */

export const CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

const END_OF_CHAIN = 0xfffffffe;
const FREE_SECTOR = 0xffffffff;
const NO_STREAM = 0xffffffff;
const HEADER_DIFAT_ENTRIES = 109;
const DIRECTORY_ENTRY_SIZE = 128;
const TYPE_STREAM = 2;
const TYPE_ROOT = 5;

export class CorruptFileError extends Error {
  constructor() {
    super("Arquivo corrompido");
    this.name = "CorruptFileError";
  }
}

export function isCompoundFile(bytes: Uint8Array): boolean {
  return CFB_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** Fluxos do nível principal, por nome em minúsculas ("workbook", "encryptedpackage"…). */
export function readCompoundFile(bytes: Uint8Array): Map<string, Uint8Array> {
  if (!isCompoundFile(bytes) || bytes.length < 512) throw new CorruptFileError();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u32 = (offset: number) => {
    if (offset < 0 || offset + 4 > bytes.length) throw new CorruptFileError();
    return view.getUint32(offset, true);
  };
  const u16 = (offset: number) => {
    if (offset < 0 || offset + 2 > bytes.length) throw new CorruptFileError();
    return view.getUint16(offset, true);
  };

  const sectorShift = u16(0x1e);
  if (sectorShift !== 9 && sectorShift !== 12) throw new CorruptFileError();
  const sectorSize = 1 << sectorShift;
  const miniSectorSize = 1 << u16(0x20);
  const miniStreamCutoff = u32(0x38);
  // O cabeçalho ocupa o primeiro setor; o setor N começa em (N + 1) × tamanho do setor.
  const sectorCount = Math.ceil((bytes.length - sectorSize) / sectorSize);
  const sectorOffset = (sector: number) => {
    if (sector >= sectorCount) throw new CorruptFileError();
    return (sector + 1) * sectorSize;
  };
  const sectorData = (sector: number) => {
    const start = sectorOffset(sector);
    return bytes.subarray(start, Math.min(start + sectorSize, bytes.length));
  };

  // Tabela de alocação (FAT): setores listados no cabeçalho e na cadeia DIFAT.
  const fatSectors: number[] = [];
  for (let i = 0; i < HEADER_DIFAT_ENTRIES; i += 1) {
    const sector = u32(0x4c + i * 4);
    if (sector !== FREE_SECTOR) fatSectors.push(sector);
  }
  let difatSector = u32(0x44);
  const visitedDifat = new Set<number>();
  while (difatSector !== END_OF_CHAIN && difatSector !== FREE_SECTOR) {
    if (visitedDifat.has(difatSector)) throw new CorruptFileError();
    visitedDifat.add(difatSector);
    const base = sectorOffset(difatSector);
    const perSector = sectorSize / 4 - 1;
    for (let i = 0; i < perSector; i += 1) {
      const sector = u32(base + i * 4);
      if (sector !== FREE_SECTOR) fatSectors.push(sector);
    }
    difatSector = u32(base + perSector * 4);
  }
  const fat: number[] = [];
  for (const sector of fatSectors) {
    const base = sectorOffset(sector);
    for (let i = 0; i < sectorSize / 4; i += 1) fat.push(u32(base + i * 4));
  }

  const chain = (start: number, table: readonly number[]): number[] => {
    const sectors: number[] = [];
    const visited = new Set<number>();
    let sector = start;
    while (sector !== END_OF_CHAIN) {
      if (sector >= table.length || visited.has(sector)) throw new CorruptFileError();
      visited.add(sector);
      sectors.push(sector);
      sector = table[sector] ?? END_OF_CHAIN;
    }
    return sectors;
  };
  const readChain = (start: number, size: number): Uint8Array => {
    if (start === END_OF_CHAIN || size === 0) return new Uint8Array(0);
    const sectors = chain(start, fat);
    if (sectors.length * sectorSize < size) throw new CorruptFileError();
    const output = new Uint8Array(size);
    let written = 0;
    for (const sector of sectors) {
      if (written >= size) break;
      const data = sectorData(sector).subarray(0, size - written);
      output.set(data, written);
      written += data.length;
    }
    if (written < size) throw new CorruptFileError();
    return output;
  };

  // Diretório: entradas de 128 bytes numa cadeia de setores comum.
  const directorySectors = chain(u32(0x30), fat);
  const directory = new Uint8Array(directorySectors.length * sectorSize);
  directorySectors.forEach((sector, index) =>
    directory.set(sectorData(sector), index * sectorSize),
  );
  const directoryView = new DataView(directory.buffer);
  const entryCount = directory.length / DIRECTORY_ENTRY_SIZE;
  const entry = (index: number) => {
    if (index >= entryCount) throw new CorruptFileError();
    const base = index * DIRECTORY_ENTRY_SIZE;
    const nameLength = Math.min(directoryView.getUint16(base + 0x40, true), 64);
    const name = new TextDecoder("utf-16le").decode(
      directory.subarray(base, base + Math.max(0, nameLength - 2)),
    );
    return {
      name,
      type: directory[base + 0x42] ?? 0,
      left: directoryView.getUint32(base + 0x44, true),
      right: directoryView.getUint32(base + 0x48, true),
      child: directoryView.getUint32(base + 0x4c, true),
      start: directoryView.getUint32(base + 0x74, true),
      size: directoryView.getUint32(base + 0x78, true),
    };
  };

  const root = entry(0);
  if (root.type !== TYPE_ROOT) throw new CorruptFileError();
  // Fluxos pequenos ficam no "mini stream", guardado na cadeia da entrada raiz.
  const miniStream = readChain(root.start, root.size);
  const miniFatSectors = chain(u32(0x3c), fat);
  const miniFat: number[] = [];
  for (const sector of miniFatSectors) {
    const base = sectorOffset(sector);
    for (let i = 0; i < sectorSize / 4; i += 1) miniFat.push(u32(base + i * 4));
  }
  const readMiniChain = (start: number, size: number): Uint8Array => {
    const sectors = chain(start, miniFat);
    const output = new Uint8Array(size);
    let written = 0;
    for (const sector of sectors) {
      if (written >= size) break;
      const begin = sector * miniSectorSize;
      if (begin + Math.min(miniSectorSize, size - written) > miniStream.length) {
        throw new CorruptFileError();
      }
      const data = miniStream.subarray(begin, begin + Math.min(miniSectorSize, size - written));
      output.set(data, written);
      written += data.length;
    }
    if (written < size) throw new CorruptFileError();
    return output;
  };

  // Filhos da raiz: árvore binária (rubro-negra) a partir de `child`.
  const streams = new Map<string, Uint8Array>();
  const pending = [root.child];
  const visited = new Set<number>();
  while (pending.length > 0) {
    const index = pending.pop() ?? NO_STREAM;
    if (index === NO_STREAM) continue;
    if (visited.has(index)) throw new CorruptFileError();
    visited.add(index);
    const item = entry(index);
    pending.push(item.left, item.right);
    if (item.type !== TYPE_STREAM) continue;
    const data =
      item.size < miniStreamCutoff
        ? readMiniChain(item.start, item.size)
        : readChain(item.start, item.size);
    streams.set(item.name.toLowerCase(), data);
  }
  return streams;
}

/** Nome do produto (ADR-016): trocar aqui basta para renomear a interface. */
export const APP_NAME = "Sorteio360";

/** Autor (crédito no rodapé) e perfil público. */
export const AUTHOR_NAME = "Daniel Thomaseto";
export const AUTHOR_INSTAGRAM = "https://www.instagram.com/danithomaseto/";

export const PRIVACY_MESSAGE =
  "Seus dados ficam apenas no seu navegador, durante o sorteio. Não recebemos nem armazenamos sua lista de participantes ou seus resultados.";

export const SITE_URL = import.meta.env.VITE_SITE_URL ?? "";

export const SITE_DESCRIPTION =
  "Sorteador de nomes online, grátis e sem cadastro. Cole ou importe a lista (Excel ou CSV), escolha quantos vencedores e sorteie — tudo no seu navegador, sem enviar os nomes para servidores.";

export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL?.trim() ?? "";

const MEGABYTE = 1024 * 1024;

/**
 * Limites do produto. Tudo roda no navegador; os limites protegem a aba de travar ou ficar sem
 * memória com arquivos enormes ou malformados (ver docs/security.md).
 */
export const LIMITS = {
  /** Participantes por sorteio. */
  maxParticipants: 50_000,
  /** Vencedores por rodada. */
  maxRoundQuantity: 10_000,
  maxNameLength: 120,
  maxDrawNameLength: 100,
  /** Tamanho do arquivo importado (.xlsx, .xls ou .csv). */
  maxFileBytes: 10 * MEGABYTE,
  /** Soma dos arquivos internos de um .xlsx depois de descompactados (proteção contra zip bomb). */
  maxUncompressedBytes: 80 * MEGABYTE,
  /** Texto colado. */
  maxTextChars: 2_000_000,
  /** Colunas oferecidas para escolha numa planilha. */
  maxColumns: 50,
  /** A leitura de uma aba termina depois de tantas linhas vazias seguidas. */
  maxBlankStreak: 10_000,
} as const;

export type Limits = typeof LIMITS;

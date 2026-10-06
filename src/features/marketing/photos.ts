/**
 * Fotos reais de uso do Sorteio360 (eventos, salas de aula, confraternizações) para a página
 * inicial. Coloque os arquivos em `public/fotos/` e liste-os aqui; a seção "Em uso" só aparece
 * quando houver fotos. Nunca use bancos de imagem genéricos nem ilustrações: as fotos recebem o
 * mesmo tratamento de cor (preto e branco quente com grão) para formar um conjunto coerente.
 */
export interface LandingPhoto {
  /** Caminho público, ex.: "/fotos/feira-de-ciencias.jpg". */
  readonly src: string;
  readonly alt: string;
  readonly caption?: string;
  readonly width: number;
  readonly height: number;
}

export const LANDING_PHOTOS: readonly LandingPhoto[] = [];

/**
 * Estado da sessão: existe só na memória da aba (ADR-017). Recarregar ou fechar descarta tudo.
 * Nada daqui é enviado para servidores (ADR-022).
 */
export type Source = "manual" | "paste" | "csv" | "xlsx" | "xls";
export type RevealMode = "compact" | "sequential";

export interface Participant {
  readonly id: string;
  /** Nome normalizado (ver `services/names.ts`). */
  readonly name: string;
  /** Chave de duplicidade (sem acentos, maiúsculas e espaços extras). */
  readonly key: string;
  readonly source: Source;
  /** Rodada em que foi sorteado e removido da lista de disponíveis; `null` se disponível. */
  readonly removedInRound: number | null;
}

export interface DrawSettings {
  readonly quantity: number;
  readonly allowRepeat: boolean;
  readonly removeWinners: boolean;
  readonly revealMode: RevealMode;
}

export interface Winner {
  readonly position: number;
  readonly participantId: string;
  readonly name: string;
}

export interface Round {
  readonly number: number;
  readonly drawnAt: string;
  readonly quantity: number;
  readonly allowRepeat: boolean;
  readonly removeWinners: boolean;
  readonly totalParticipants: number;
  readonly poolSize: number;
  readonly availableAfter: number;
  readonly algorithm: string;
  readonly winners: readonly Winner[];
}

export interface SessionState {
  readonly name: string;
  readonly participants: readonly Participant[];
  readonly settings: DrawSettings;
  readonly rounds: readonly Round[];
}

export interface NormalizedEntry {
  readonly name: string;
  readonly key: string;
}

export interface PoolMember {
  readonly id: string;
  readonly name: string;
}

/** Resultado do motor de sorteio para uma rodada (posições na lista congelada no clique). */
export interface RoundOutcome {
  readonly positions: readonly number[];
  readonly drawnAt: string;
  readonly algorithm: string;
  readonly quantity: number;
  readonly allowRepeat: boolean;
}

export const QUANTITY_PRESETS = [1, 3, 5, 10, 20] as const;

export const DEFAULT_SETTINGS: DrawSettings = {
  quantity: 1,
  allowRepeat: false,
  removeWinners: true,
  revealMode: "compact",
};

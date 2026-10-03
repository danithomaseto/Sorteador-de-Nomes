import type { Limits } from "~/lib/api/client";
import { formatNumber } from "~/lib/format";
import type { Participant, PoolMember, SessionState } from "./model";

export interface SessionStats {
  readonly total: number;
  readonly available: number;
  readonly removed: number;
}

export function availableParticipants(state: SessionState): Participant[] {
  return state.participants.filter((p) => p.removedInRound === null);
}

/** Lista congelada enviada ao sorteio: só id e nome, na ordem da lista. */
export function poolSnapshot(state: SessionState): PoolMember[] {
  return availableParticipants(state).map(({ id, name }) => ({ id, name }));
}

export function sessionStats(state: SessionState): SessionStats {
  const available = state.participants.reduce((n, p) => (p.removedInRound === null ? n + 1 : n), 0);
  return {
    total: state.participants.length,
    available,
    removed: state.participants.length - available,
  };
}

export function hasSessionData(state: SessionState): boolean {
  return state.participants.length > 0 || state.rounds.length > 0;
}

/** Chaves que aparecem mais de uma vez (possíveis duplicados). */
export function duplicateKeys(participants: readonly Participant[]): Set<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const { key } of participants) {
    if (seen.has(key)) repeated.add(key);
    else seen.add(key);
  }
  return repeated;
}

export type DrawBlocker =
  | { code: "no_participants" }
  | { code: "all_used" }
  | { code: "invalid_quantity" }
  | { code: "exceeds_available"; available: number }
  | { code: "exceeds_max"; max: number };

/** Espelha as validações do servidor para dar retorno imediato (o servidor continua sendo a autoridade). */
export function drawBlocker(
  state: SessionState,
  limits: Pick<Limits, "max_round_quantity">,
): DrawBlocker | null {
  const { total, available } = sessionStats(state);
  const { quantity, allowRepeat } = state.settings;
  if (total === 0) return { code: "no_participants" };
  if (available === 0) return { code: "all_used" };
  if (!Number.isInteger(quantity) || quantity < 1) return { code: "invalid_quantity" };
  if (quantity > limits.max_round_quantity)
    return { code: "exceeds_max", max: limits.max_round_quantity };
  if (!allowRepeat && quantity > available) return { code: "exceeds_available", available };
  return null;
}

export function blockerMessage(blocker: DrawBlocker): string {
  switch (blocker.code) {
    case "no_participants":
      return "Adicione pelo menos 1 participante para sortear.";
    case "all_used":
      return "Todos os participantes já foram sorteados. Restaure a lista para continuar.";
    case "invalid_quantity":
      return "Informe um número inteiro a partir de 1.";
    case "exceeds_available":
      return blocker.available === 1
        ? "Há apenas 1 participante disponível. Diminua a quantidade ou permita repetição."
        : `Há apenas ${formatNumber(blocker.available)} participantes disponíveis. Diminua a quantidade ou permita repetição.`;
    case "exceeds_max":
      return `O máximo por rodada é ${formatNumber(blocker.max)} vencedores.`;
  }
}

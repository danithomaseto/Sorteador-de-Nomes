import type {
  DrawSettings,
  NormalizedEntry,
  Participant,
  PoolMember,
  Round,
  RoundOutcome,
  SessionState,
  Source,
} from "./model";
import { DEFAULT_SETTINGS } from "./model";

export type SessionAction =
  | { type: "rename"; name: string }
  | {
      type: "addParticipants";
      entries: readonly NormalizedEntry[];
      source: Source;
      ids: readonly string[];
    }
  | { type: "renameParticipant"; id: string; entry: NormalizedEntry }
  | { type: "removeParticipant"; id: string }
  | { type: "reinsertParticipant"; participant: Participant; index: number }
  | { type: "clearParticipants" }
  | { type: "restoreParticipants" }
  | { type: "updateSettings"; changes: Partial<DrawSettings> }
  | {
      type: "recordRound";
      pool: readonly PoolMember[];
      outcome: RoundOutcome;
      removeWinners: boolean;
    }
  | { type: "reset"; name: string };

export function createSession(name: string): SessionState {
  return { name, participants: [], settings: DEFAULT_SETTINGS, rounds: [] };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "rename":
      return { ...state, name: action.name };

    case "addParticipants": {
      if (action.ids.length !== action.entries.length) {
        throw new Error("Cada participante precisa de um identificador.");
      }
      const added = action.entries.map<Participant>((entry, index) => ({
        id: action.ids[index] ?? "",
        name: entry.name,
        key: entry.key,
        source: action.source,
        removedInRound: null,
      }));
      return { ...state, participants: [...state.participants, ...added] };
    }

    case "renameParticipant":
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.id ? { ...p, name: action.entry.name, key: action.entry.key } : p,
        ),
      };

    case "removeParticipant":
      return { ...state, participants: state.participants.filter((p) => p.id !== action.id) };

    case "reinsertParticipant": {
      if (state.participants.some((p) => p.id === action.participant.id)) return state;
      const participants = [...state.participants];
      participants.splice(Math.min(action.index, participants.length), 0, action.participant);
      return { ...state, participants };
    }

    case "clearParticipants":
      return { ...state, participants: [] };

    case "restoreParticipants":
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.removedInRound === null ? p : { ...p, removedInRound: null },
        ),
      };

    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.changes } };

    case "recordRound":
      return recordRound(state, action.pool, action.outcome, action.removeWinners);

    case "reset":
      return createSession(action.name);
  }
}

/**
 * Registra uma rodada: traduz as posições sorteadas pelo servidor em participantes da lista
 * congelada no momento do clique e, se pedido, remove os vencedores das próximas rodadas.
 * Rodadas só são adicionadas, nunca alteradas (ADR-005).
 */
function recordRound(
  state: SessionState,
  pool: readonly PoolMember[],
  outcome: RoundOutcome,
  removeWinners: boolean,
): SessionState {
  const number = state.rounds.length + 1;
  const winners = outcome.positions.map((position, index) => {
    const member = pool[position];
    if (!member) throw new Error("Posição sorteada fora da lista enviada.");
    return { position: index + 1, participantId: member.id, name: member.name };
  });

  const winnerIds = new Set(winners.map((winner) => winner.participantId));
  const participants = removeWinners
    ? state.participants.map((p) =>
        winnerIds.has(p.id) && p.removedInRound === null ? { ...p, removedInRound: number } : p,
      )
    : state.participants;

  const round: Round = {
    number,
    drawnAt: outcome.drawnAt,
    quantity: outcome.quantity,
    allowRepeat: outcome.allowRepeat,
    removeWinners,
    totalParticipants: state.participants.length,
    poolSize: pool.length,
    availableAfter: participants.filter((p) => p.removedInRound === null).length,
    algorithm: outcome.algorithm,
    winners,
  };
  return { ...state, participants, rounds: [...state.rounds, round] };
}

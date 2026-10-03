import { describe, expect, it } from "vitest";
import type { NormalizedEntry, RoundOutcome, SessionState } from "./model";
import {
  availableParticipants,
  drawBlocker,
  duplicateKeys,
  poolSnapshot,
  sessionStats,
} from "./selectors";
import { createSession, sessionReducer, type SessionAction } from "./sessionReducer";

const LIMITS = { max_round_quantity: 10_000 };

function entries(...names: string[]): NormalizedEntry[] {
  return names.map((name) => ({ name, key: name.toLowerCase() }));
}

function apply(state: SessionState, ...actions: SessionAction[]): SessionState {
  return actions.reduce(sessionReducer, state);
}

function withPeople(count: number): SessionState {
  const names = Array.from({ length: count }, (_, i) => `Pessoa ${String(i + 1)}`);
  return apply(createSession("Teste"), {
    type: "addParticipants",
    entries: entries(...names),
    source: "paste",
    ids: names.map((_, i) => `id-${String(i + 1)}`),
  });
}

function outcome(positions: number[], overrides: Partial<RoundOutcome> = {}): RoundOutcome {
  return {
    positions,
    drawnAt: "2026-10-03T21:35:12Z",
    algorithm: "partial-fisher-yates/1+os-csprng",
    quantity: positions.length,
    allowRepeat: false,
    ...overrides,
  };
}

function draw(state: SessionState, positions: number[], removeWinners = true): SessionState {
  return sessionReducer(state, {
    type: "recordRound",
    pool: poolSnapshot(state),
    outcome: outcome(positions),
    removeWinners,
  });
}

describe("participantes", () => {
  it("adiciona com identificadores próprios, mantendo a ordem", () => {
    const state = withPeople(3);
    expect(state.participants.map((p) => [p.id, p.name, p.source])).toEqual([
      ["id-1", "Pessoa 1", "paste"],
      ["id-2", "Pessoa 2", "paste"],
      ["id-3", "Pessoa 3", "paste"],
    ]);
    expect(sessionStats(state)).toEqual({ total: 3, available: 3, removed: 0 });
  });

  it("aceita nomes iguais como participantes distintos", () => {
    const state = apply(createSession("Teste"), {
      type: "addParticipants",
      entries: entries("João Silva", "João Silva"),
      source: "manual",
      ids: ["a", "b"],
    });
    expect(state.participants).toHaveLength(2);
    expect(duplicateKeys(state.participants)).toEqual(new Set(["joão silva"]));
  });

  it("exige um identificador por participante", () => {
    expect(() =>
      sessionReducer(createSession("Teste"), {
        type: "addParticipants",
        entries: entries("Ana"),
        source: "manual",
        ids: [],
      }),
    ).toThrow();
  });

  it("edita o nome preservando a situação no sorteio", () => {
    let state = draw(withPeople(2), [0]);
    state = sessionReducer(state, {
      type: "renameParticipant",
      id: "id-1",
      entry: { name: "Ana Lima", key: "ana lima" },
    });
    expect(state.participants[0]).toMatchObject({
      name: "Ana Lima",
      key: "ana lima",
      removedInRound: 1,
    });
  });

  it("exclui e desfaz a exclusão na mesma posição", () => {
    const state = withPeople(3);
    const removed = state.participants[1];
    if (!removed) throw new Error("participante esperado");
    const afterRemoval = sessionReducer(state, { type: "removeParticipant", id: removed.id });
    expect(afterRemoval.participants.map((p) => p.id)).toEqual(["id-1", "id-3"]);
    const restored = sessionReducer(afterRemoval, {
      type: "reinsertParticipant",
      participant: removed,
      index: 1,
    });
    expect(restored.participants.map((p) => p.id)).toEqual(["id-1", "id-2", "id-3"]);
    expect(
      sessionReducer(restored, { type: "reinsertParticipant", participant: removed, index: 0 }),
    ).toBe(restored);
  });

  it("limpa a lista mantendo o histórico", () => {
    const state = apply(draw(withPeople(3), [0]), { type: "clearParticipants" });
    expect(state.participants).toEqual([]);
    expect(state.rounds).toHaveLength(1);
  });
});

describe("rodadas", () => {
  it("traduz posições em vencedores e numera a rodada", () => {
    const state = draw(withPeople(5), [3, 0]);
    const round = state.rounds[0];
    expect(round).toMatchObject({
      number: 1,
      quantity: 2,
      totalParticipants: 5,
      poolSize: 5,
      availableAfter: 3,
      removeWinners: true,
    });
    expect(round?.winners).toEqual([
      { position: 1, participantId: "id-4", name: "Pessoa 4" },
      { position: 2, participantId: "id-1", name: "Pessoa 1" },
    ]);
  });

  it("remove vencedores entre rodadas: 100 → 95 → 90", () => {
    let state = withPeople(100);
    state = draw(state, [0, 1, 2, 3, 4]);
    expect(sessionStats(state).available).toBe(95);
    // A segunda rodada sorteia posições na nova lista de disponíveis.
    state = draw(state, [0, 1, 2, 3, 4]);
    expect(sessionStats(state).available).toBe(90);
    const winners = state.rounds.flatMap((r) => r.winners.map((w) => w.participantId));
    expect(new Set(winners).size).toBe(10);
    expect(state.rounds.map((r) => [r.number, r.poolSize, r.availableAfter])).toEqual([
      [1, 100, 95],
      [2, 95, 90],
    ]);
    expect(availableParticipants(state).some((p) => winners.includes(p.id))).toBe(false);
  });

  it("sem remover vencedores, todos continuam disponíveis", () => {
    const state = draw(withPeople(4), [2], false);
    expect(sessionStats(state).available).toBe(4);
    expect(state.rounds[0]?.availableAfter).toBe(4);
    expect(state.participants.every((p) => p.removedInRound === null)).toBe(true);
  });

  it("com repetição, o mesmo participante pode aparecer duas vezes e é removido uma vez", () => {
    const state = sessionReducer(withPeople(2), {
      type: "recordRound",
      pool: poolSnapshot(withPeople(2)),
      outcome: outcome([1, 1, 0], { allowRepeat: true }),
      removeWinners: true,
    });
    expect(state.rounds[0]?.winners.map((w) => w.participantId)).toEqual(["id-2", "id-2", "id-1"]);
    expect(state.participants.map((p) => p.removedInRound)).toEqual([1, 1]);
  });

  it("recusa posição fora da lista enviada", () => {
    const state = withPeople(2);
    expect(() =>
      sessionReducer(state, {
        type: "recordRound",
        pool: poolSnapshot(state),
        outcome: outcome([5]),
        removeWinners: true,
      }),
    ).toThrow();
  });

  it("restaura todos os participantes sem apagar o histórico", () => {
    let state = draw(draw(withPeople(3), [0]), [0]);
    state = sessionReducer(state, { type: "restoreParticipants" });
    expect(sessionStats(state)).toEqual({ total: 3, available: 3, removed: 0 });
    expect(state.rounds).toHaveLength(2);
  });

  it("novo sorteio descarta tudo", () => {
    const state = sessionReducer(draw(withPeople(3), [0]), { type: "reset", name: "Novo" });
    expect(state).toEqual(createSession("Novo"));
  });
});

describe("configuração e validação", () => {
  it("atualiza só o que mudou", () => {
    const state = sessionReducer(createSession("Teste"), {
      type: "updateSettings",
      changes: { quantity: 10, allowRepeat: true },
    });
    expect(state.settings).toEqual({
      quantity: 10,
      allowRepeat: true,
      removeWinners: true,
      revealMode: "compact",
    });
  });

  it("aponta o motivo que impede o sorteio", () => {
    const empty = createSession("Teste");
    expect(drawBlocker(empty, LIMITS)).toEqual({ code: "no_participants" });

    const three = withPeople(3);
    expect(drawBlocker(three, LIMITS)).toBeNull();

    const tooMany = sessionReducer(three, { type: "updateSettings", changes: { quantity: 4 } });
    expect(drawBlocker(tooMany, LIMITS)).toEqual({ code: "exceeds_available", available: 3 });

    const withRepeat = sessionReducer(tooMany, {
      type: "updateSettings",
      changes: { allowRepeat: true },
    });
    expect(drawBlocker(withRepeat, LIMITS)).toBeNull();
    expect(drawBlocker(withRepeat, { max_round_quantity: 3 })).toEqual({
      code: "exceeds_max",
      max: 3,
    });

    const invalid = sessionReducer(three, { type: "updateSettings", changes: { quantity: 1.5 } });
    expect(drawBlocker(invalid, LIMITS)).toEqual({ code: "invalid_quantity" });

    const used = draw(three, [0, 1, 2]);
    expect(
      drawBlocker(
        sessionReducer(used, { type: "updateSettings", changes: { quantity: 1 } }),
        LIMITS,
      ),
    ).toEqual({
      code: "all_used",
    });
  });
});

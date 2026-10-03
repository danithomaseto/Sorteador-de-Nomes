import { useCallback } from "react";
import { useToast } from "~/components/Toast";
import type { NormalizedEntry, Participant, Source } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import { useAnnounce } from "~/lib/a11y/Announcer";
import { countLabel } from "~/lib/format";

/** Ações sobre a lista com retorno visual (toast) e para leitores de tela (anúncio). */
export function useParticipantActions() {
  const { state, dispatch } = useSession();
  const toast = useToast();
  const announce = useAnnounce();

  const addEntries = useCallback(
    (entries: readonly NormalizedEntry[], source: Source) => {
      if (entries.length === 0) return;
      dispatch({
        type: "addParticipants",
        entries,
        source,
        ids: entries.map(() => crypto.randomUUID()),
      });
      const total = state.participants.length + entries.length;
      announce(
        entries.length === 1
          ? `Adicionamos ${entries[0]?.name ?? ""}. ${countLabel(total, "participante", "participantes")} na lista.`
          : `Adicionamos ${countLabel(entries.length, "participante", "participantes")}. Total: ${countLabel(total, "participante", "participantes")}.`,
      );
    },
    [announce, dispatch, state.participants.length],
  );

  const removeParticipant = useCallback(
    (participant: Participant) => {
      const index = state.participants.findIndex((p) => p.id === participant.id);
      dispatch({ type: "removeParticipant", id: participant.id });
      toast({
        message: `Excluímos “${participant.name}” da lista.`,
        action: {
          label: "Desfazer",
          onAction: () => {
            dispatch({ type: "reinsertParticipant", participant, index });
          },
        },
      });
    },
    [dispatch, state.participants, toast],
  );

  const renameParticipant = useCallback(
    (participant: Participant, entry: NormalizedEntry) => {
      dispatch({ type: "renameParticipant", id: participant.id, entry });
      announce(`Nome alterado para ${entry.name}.`);
    },
    [announce, dispatch],
  );

  return { addEntries, removeParticipant, renameParticipant };
}

import { useMemo, useState } from "react";
import { useToast } from "~/components/Toast";
import { useParticipantActions } from "~/features/participants/useParticipantActions";
import type { Source } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import type { ImportPreview } from "~/lib/api/client";
import { countLabel, formatNumber } from "~/lib/format";
import { useLimits } from "~/lib/useLimits";
import { selectImport, type DuplicatePolicy } from "./importSelection";

/** Decisão sobre repetidos, limite de participantes e confirmação — comum aos dois diálogos. */
export function useImportConfirm(
  preview: ImportPreview | null,
  source: Source,
  onDone: () => void,
) {
  const { state } = useSession();
  const { addEntries } = useParticipantActions();
  const toast = useToast();
  const limits = useLimits();
  const [policy, setPolicy] = useState<DuplicatePolicy>("keep-all");

  const existingKeys = useMemo(
    () => new Set(state.participants.map((p) => p.key)),
    [state.participants],
  );
  const selection = useMemo(
    () => (preview ? selectImport(preview, existingKeys, policy) : null),
    [existingKeys, policy, preview],
  );

  const count = selection?.selected.length ?? 0;
  const overLimit = state.participants.length + count > limits.max_participants;
  const limitMessage = overLimit
    ? `A lista passaria do limite de ${formatNumber(limits.max_participants)} participantes por sorteio.`
    : null;

  function confirm() {
    if (!selection || count === 0 || overLimit) return;
    addEntries(selection.selected, source);
    toast({
      tone: "success",
      message: `${countLabel(count, "participante adicionado", "participantes adicionados")}.`,
    });
    onDone();
  }

  return {
    policy,
    setPolicy,
    existingKeys,
    selection,
    count,
    limitMessage,
    canConfirm: count > 0 && !overLimit,
    confirm,
  };
}

import { useMemo, useState } from "react";
import { useToast } from "~/components/Toast";
import { useParticipantActions } from "~/features/participants/useParticipantActions";
import type { Source } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import type { ImportPreview } from "~/services/import";
import { LIMITS } from "~/config";
import { countLabel, formatNumber } from "~/utils/format";
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
  // Padrão: repetidos ficam de fora (evita a mesma pessoa com duas chances); a pessoa pode
  // manter todos quando forem homônimos.
  const [policy, setPolicy] = useState<DuplicatePolicy>("skip-repeated");

  const existingKeys = useMemo(
    () => new Set(state.participants.map((p) => p.key)),
    [state.participants],
  );
  const selection = useMemo(
    () => (preview ? selectImport(preview, existingKeys, policy) : null),
    [existingKeys, policy, preview],
  );

  const count = selection?.selected.length ?? 0;
  const overLimit = state.participants.length + count > LIMITS.maxParticipants;
  const limitMessage = overLimit
    ? `A lista passaria do limite de ${formatNumber(LIMITS.maxParticipants)} participantes por sorteio.`
    : null;

  function confirm() {
    if (!selection || count === 0 || overLimit) return;
    addEntries(selection.selected, source);
    const skipped = selection.found - count;
    toast({
      tone: "success",
      message:
        skipped > 0
          ? `${countLabel(count, "participante adicionado", "participantes adicionados")}. ${countLabel(skipped, "nome duplicado foi ignorado", "nomes duplicados foram ignorados")}.`
          : `${countLabel(count, "participante adicionado", "participantes adicionados")}.`,
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

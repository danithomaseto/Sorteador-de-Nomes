import { useRef, useState } from "react";
import { Button } from "~/components/Button";
import { Dialog } from "~/components/Dialog";
import { TextField } from "~/components/Field";
import type { Participant } from "~/features/session/model";
import { api } from "~/lib/api/client";
import { errorMessage } from "~/lib/api/messages";
import { useAsyncAction } from "~/lib/useAsyncAction";
import { useParticipantActions } from "./useParticipantActions";

interface EditParticipantDialogProps {
  participant: Participant;
  onClose: () => void;
}

export function EditParticipantDialog({ participant, onClose }: EditParticipantDialogProps) {
  const { renameParticipant } = useParticipantActions();
  const [value, setValue] = useState(participant.name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalize = useAsyncAction((signal, text: string) =>
    api.importText({ text, separator: "newline" }, signal),
  );

  async function save() {
    const preview = await normalize.run(value);
    if (!preview) return;
    const entry = preview.entries[0];
    if (!entry) {
      setError(
        preview.issues.length > 0
          ? `O nome pode ter no máximo ${String(preview.max_name_length)} caracteres.`
          : "O nome não pode ficar vazio.",
      );
      return;
    }
    renameParticipant(participant, { name: entry.name, key: entry.key });
    onClose();
  }

  const formId = "editar-participante";
  return (
    <Dialog
      open
      size="sm"
      title="Editar participante"
      onClose={onClose}
      dismissible={!normalize.pending}
      initialFocusRef={inputRef}
      footer={
        <>
          <Button onClick={onClose} disabled={normalize.pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={normalize.pending}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <TextField
          ref={inputRef}
          label="Nome"
          value={value}
          autoComplete="off"
          spellCheck={false}
          error={
            error ?? (normalize.status === "error" ? errorMessage(normalize.error) : undefined)
          }
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
      </form>
    </Dialog>
  );
}

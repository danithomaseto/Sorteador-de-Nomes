import { useRef, useState } from "react";
import { Button } from "~/components/Button";
import { Dialog } from "~/components/Dialog";
import { TextField } from "~/components/Field";
import type { Participant } from "~/features/session/model";
import { checkName, nameProblemMessage } from "~/services/names";
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
  function save() {
    const checked = checkName(value);
    if (!checked.ok) {
      setError(nameProblemMessage(checked.problem));
      inputRef.current?.focus();
      return;
    }
    renameParticipant(participant, { name: checked.name, key: checked.key });
    onClose();
  }

  const formId = "editar-participante";
  return (
    <Dialog
      open
      size="sm"
      title="Editar participante"
      onClose={onClose}
      initialFocusRef={inputRef}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">
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
          save();
        }}
      >
        <TextField
          ref={inputRef}
          label="Nome"
          value={value}
          autoComplete="off"
          spellCheck={false}
          error={error ?? undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
      </form>
    </Dialog>
  );
}

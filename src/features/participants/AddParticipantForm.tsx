import { useRef, useState, type SyntheticEvent } from "react";
import { Button } from "~/components/Button";
import { TextField } from "~/components/Field";
import { InlineAlert } from "~/components/InlineAlert";
import type { NormalizedEntry } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import { checkName, nameProblemMessage } from "~/services/names";
import styles from "./AddParticipantForm.module.css";
import { useParticipantActions } from "./useParticipantActions";

/**
 * Adiciona um nome por vez, normalizado no próprio navegador (mesma regra de todas as fontes).
 * Um nome que já está na lista não entra direto: pode ser a mesma pessoa digitada de novo, ou um
 * homônimo — a pessoa decide.
 */
export function AddParticipantForm({ disabled = false }: { disabled?: boolean }) {
  const { state } = useSession();
  const { addEntries } = useParticipantActions();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ entry: NormalizedEntry; existing: string } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function add(entry: NormalizedEntry) {
    addEntries([entry], "manual");
    setValue("");
    setDuplicate(null);
    inputRef.current?.focus();
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = checkName(value);
    if (!checked.ok) {
      setError(
        checked.problem === "empty"
          ? "Digite um nome para adicionar."
          : nameProblemMessage(checked.problem),
      );
      inputRef.current?.focus();
      return;
    }
    const entry = { name: checked.name, key: checked.key };
    const existing = state.participants.find((participant) => participant.key === entry.key);
    if (existing) {
      setDuplicate({ entry, existing: existing.name });
      return;
    }
    add(entry);
  }

  return (
    <div className={styles.root}>
      <form className={styles.form} noValidate onSubmit={submit}>
        <TextField
          ref={inputRef}
          className={styles.field}
          label="Nome do participante"
          placeholder="Ex.: Maria Souza"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          value={value}
          disabled={disabled}
          error={error ?? undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
            setDuplicate(null);
          }}
        />
        <Button type="submit" icon="plus" className={styles.submit} disabled={disabled}>
          Adicionar
        </Button>
      </form>
      {duplicate ? (
        <InlineAlert
          tone="warning"
          live
          actions={
            <>
              <Button
                size="sm"
                onClick={() => {
                  add(duplicate.entry);
                }}
              >
                Adicionar mesmo assim
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDuplicate(null);
                  setValue("");
                  inputRef.current?.focus();
                }}
              >
                Não adicionar
              </Button>
            </>
          }
        >
          “{duplicate.existing}” já está na lista. Se for outra pessoa com o mesmo nome, adicione
          mesmo assim.
        </InlineAlert>
      ) : null}
    </div>
  );
}

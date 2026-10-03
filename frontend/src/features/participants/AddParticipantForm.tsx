import { useRef, useState, type SyntheticEvent } from "react";
import { Button } from "~/components/Button";
import { TextField } from "~/components/Field";
import { useSession } from "~/features/session/SessionProvider";
import { api } from "~/lib/api/client";
import { errorMessage } from "~/lib/api/messages";
import { useAsyncAction } from "~/lib/useAsyncAction";
import styles from "./AddParticipantForm.module.css";
import { useParticipantActions } from "./useParticipantActions";

type Feedback = { tone: "error" | "warning"; text: string } | null;

/** Adiciona um nome por vez. A normalização é feita pelo servidor (regra única para todas as fontes). */
export function AddParticipantForm({ disabled = false }: { disabled?: boolean }) {
  const { state } = useSession();
  const { addEntries } = useParticipantActions();
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalize = useAsyncAction((signal, text: string) =>
    api.importText({ text, separator: "newline" }, signal),
  );

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      setFeedback({ tone: "error", text: "Digite um nome para adicionar." });
      inputRef.current?.focus();
      return;
    }
    const preview = await normalize.run(value);
    if (!preview) return;
    const entry = preview.entries[0];
    if (!entry) {
      setFeedback({
        tone: "error",
        text:
          preview.issues.length > 0
            ? `O nome pode ter no máximo ${String(preview.max_name_length)} caracteres.`
            : "Digite um nome para adicionar.",
      });
      return;
    }
    const alreadyListed = state.participants.some((p) => p.key === entry.key);
    addEntries([{ name: entry.name, key: entry.key }], "manual");
    setValue("");
    setFeedback(
      alreadyListed
        ? {
            tone: "warning",
            text: `“${entry.name}” já estava na lista. Os dois foram mantidos; exclua um deles se for a mesma pessoa.`,
          }
        : null,
    );
    inputRef.current?.focus();
  }

  const error =
    feedback?.tone === "error"
      ? feedback.text
      : normalize.status === "error"
        ? errorMessage(normalize.error)
        : undefined;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        void submit(event);
      }}
    >
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
        error={error}
        hint={feedback?.tone === "warning" ? feedback.text : undefined}
        onChange={(event) => {
          setValue(event.target.value);
          if (feedback?.tone === "error") setFeedback(null);
        }}
      />
      <Button
        type="submit"
        icon="plus"
        className={styles.submit}
        loading={normalize.pending}
        disabled={disabled}
      >
        Adicionar
      </Button>
    </form>
  );
}

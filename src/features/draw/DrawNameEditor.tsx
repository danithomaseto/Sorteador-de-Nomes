import { useRef, useState } from "react";
import { Button } from "~/components/Button";
import { TextField } from "~/components/Field";
import { defaultDrawName, useSession } from "~/features/session/SessionProvider";
import { LIMITS } from "~/config";
import { normalizeName } from "~/services/names";
import styles from "./DrawNameEditor.module.css";

/** Título do sorteio, editável. Vazio volta para o nome padrão. */
export function DrawNameEditor() {
  const { state, dispatch } = useSession();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.name);
  const editButton = useRef<HTMLButtonElement>(null);

  function finish(save: boolean) {
    if (save) {
      const name = Array.from(normalizeName(draft)).slice(0, LIMITS.maxDrawNameLength).join("");
      dispatch({ type: "rename", name: name || defaultDrawName() });
    }
    setEditing(false);
    window.requestAnimationFrame(() => editButton.current?.focus());
  }

  if (editing) {
    return (
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          finish(true);
        }}
      >
        <TextField
          label="Nome do sorteio"
          hideLabel
          className={styles.field}
          inputClassName={styles.input}
          value={draft}
          maxLength={LIMITS.maxDrawNameLength}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- o campo aparece por ação explícita do usuário
          autoFocus
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") finish(false);
          }}
        />
        <Button type="submit" variant="primary">
          Salvar
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            finish(false);
          }}
        >
          Cancelar
        </Button>
      </form>
    );
  }

  return (
    <div className={styles.view}>
      <h1 className={styles.title}>{state.name}</h1>
      <Button
        ref={editButton}
        variant="ghost"
        size="sm"
        icon="pencil"
        aria-label="Renomear sorteio"
        onClick={() => {
          setDraft(state.name);
          setEditing(true);
        }}
      />
    </div>
  );
}

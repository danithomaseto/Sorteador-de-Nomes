import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "~/components/Button";
import { ConfirmDialog } from "~/components/Dialog";
import { EmptyState } from "~/components/EmptyState";
import { TextField } from "~/components/Field";
import { InlineAlert } from "~/components/InlineAlert";
import { Switch } from "~/components/Switch";
import { useToast } from "~/components/Toast";
import { FileImportDialog } from "~/features/import/FileImportDialog";
import { PasteDialog } from "~/features/import/PasteDialog";
import type { Participant } from "~/features/session/model";
import { duplicateKeys } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { countLabel, formatNumber } from "~/lib/format";
import { searchKey } from "~/lib/text";
import { AddParticipantForm } from "./AddParticipantForm";
import { EditParticipantDialog } from "./EditParticipantDialog";
import { ParticipantList } from "./ParticipantList";
import styles from "./ParticipantsPanel.module.css";
import { useParticipantActions } from "./useParticipantActions";

type OpenDialog = "paste" | "file" | null;

export function ParticipantsPanel() {
  const { state, dispatch } = useSession();
  const { removeParticipant } = useParticipantActions();
  const toast = useToast();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [editing, setEditing] = useState<Participant | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const { participants } = state;
  const duplicates = useMemo(() => duplicateKeys(participants), [participants]);
  const duplicateCount = useMemo(
    () => participants.reduce((n, p) => (duplicates.has(p.key) ? n + 1 : n), 0),
    [duplicates, participants],
  );
  const positions = useMemo(
    () => new Map(participants.map((p, i) => [p.id, i + 1])),
    [participants],
  );
  const searchIndex = useMemo(() => participants.map((p) => searchKey(p.name)), [participants]);
  const filtered = useMemo(() => {
    const needle = searchKey(deferredQuery);
    const showDuplicatesOnly = onlyDuplicates && duplicateCount > 0;
    if (!needle && !showDuplicatesOnly) return participants;
    return participants.filter(
      (p, index) =>
        (!needle || (searchIndex[index] ?? "").includes(needle)) &&
        (!showDuplicatesOnly || duplicates.has(p.key)),
    );
  }, [deferredQuery, duplicateCount, duplicates, onlyDuplicates, participants, searchIndex]);

  const total = participants.length;
  const filtering = filtered !== participants;

  return (
    <section aria-labelledby="participantes-titulo" className={styles.panel}>
      <div className={styles.header}>
        <h2 id="participantes-titulo" className={styles.title}>
          Participantes <span className={`${styles.count} numeric`}>{formatNumber(total)}</span>
        </h2>
        {total > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            icon="trash"
            onClick={() => {
              setConfirmClear(true);
            }}
          >
            Limpar lista
          </Button>
        ) : null}
      </div>

      <AddParticipantForm />

      <div className={styles.importActions}>
        <Button
          icon="clipboard"
          onClick={() => {
            setDialog("paste");
          }}
        >
          Colar lista
        </Button>
        <Button
          icon="upload"
          onClick={() => {
            setDialog("file");
          }}
        >
          Importar planilha
        </Button>
      </div>

      {total === 0 ? (
        <EmptyState icon="users" title="Nenhum participante ainda">
          Digite um nome acima, cole uma lista ou importe uma planilha do Excel (.xlsx) ou um
          arquivo .csv.
        </EmptyState>
      ) : (
        <div className={styles.listArea}>
          <div className={styles.toolbar}>
            <TextField
              type="search"
              label="Filtrar participantes"
              hideLabel
              placeholder="Filtrar por nome"
              className={styles.search}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
            {duplicateCount > 0 ? (
              <Switch
                label={`Só possíveis duplicados (${formatNumber(duplicateCount)})`}
                checked={onlyDuplicates}
                onChange={setOnlyDuplicates}
              />
            ) : null}
          </div>

          {duplicateCount > 0 && !onlyDuplicates ? (
            <InlineAlert tone="warning">
              {countLabel(duplicateCount, "participante tem", "participantes têm")} nome repetido.
              Podem ser pessoas diferentes; revise e exclua se for a mesma pessoa.
            </InlineAlert>
          ) : null}

          <p className={styles.resultCount} aria-live="polite">
            {filtering ? `${formatNumber(filtered.length)} de ${formatNumber(total)}` : ""}
          </p>

          {filtered.length === 0 ? (
            <p className={styles.noResults}>Nenhum participante corresponde ao filtro.</p>
          ) : (
            <ParticipantList
              items={filtered}
              positions={positions}
              duplicates={duplicates}
              onEdit={setEditing}
              onRemove={removeParticipant}
            />
          )}
        </div>
      )}

      {dialog === "paste" ? (
        <PasteDialog
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "file" ? (
        <FileImportDialog
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {editing ? (
        <EditParticipantDialog
          key={editing.id}
          participant={editing}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={confirmClear}
        title="Limpar a lista?"
        description="Todos os participantes serão removidos desta sessão. O histórico de rodadas continua disponível."
        confirmLabel="Limpar lista"
        onConfirm={() => {
          dispatch({ type: "clearParticipants" });
          setConfirmClear(false);
          setQuery("");
          toast({ message: "A lista de participantes foi limpa." });
        }}
        onCancel={() => {
          setConfirmClear(false);
        }}
      />
    </section>
  );
}

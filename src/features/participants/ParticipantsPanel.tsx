import { useDeferredValue, useMemo, useState, type DragEvent } from "react";
import { Button } from "~/components/Button";
import { ConfirmDialog } from "~/components/Dialog";
import { TextField } from "~/components/Field";
import { InlineAlert } from "~/components/InlineAlert";
import { Switch } from "~/components/Switch";
import { useToast } from "~/components/Toast";
import { cx } from "~/components/cx";
import { FileImportDialog } from "~/features/import/FileImportDialog";
import { ImportStart } from "~/features/import/ImportStart";
import { PasteDialog } from "~/features/import/PasteDialog";
import type { Participant } from "~/features/session/model";
import { duplicateKeys } from "~/features/session/selectors";
import { useSession } from "~/features/session/SessionProvider";
import { countLabel, formatNumber } from "~/utils/format";
import { searchKey } from "~/utils/text";
import { AddParticipantForm } from "./AddParticipantForm";
import { EditParticipantDialog } from "./EditParticipantDialog";
import { ParticipantList } from "./ParticipantList";
import styles from "./ParticipantsPanel.module.css";
import { useParticipantActions } from "./useParticipantActions";

type OpenDialog = "paste" | "file" | null;

interface ParticipantsPanelProps {
  /**
   * Desktop: o painel ocupa a altura da coluna e a lista rola por dentro. Sem isso (celular), a
   * lista rola com a página.
   */
  fill?: boolean;
  /** Título só para leitores de tela (no celular, a aba já diz qual é a seção). */
  hideTitle?: boolean;
}

export function ParticipantsPanel({ fill = false, hideTitle = false }: ParticipantsPanelProps) {
  const { state, dispatch } = useSession();
  const { removeParticipant } = useParticipantActions();
  const toast = useToast();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
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

  function openFile(file: File | null) {
    setDroppedFile(file);
    setDialog("file");
  }

  // Soltar um arquivo em qualquer ponto da lista abre a importação já com ele.
  const isFileDrag = (event: DragEvent) => event.dataTransfer.types.includes("Files");
  const dropHandlers =
    dialog === null
      ? {
          onDragOver: (event: DragEvent) => {
            if (!isFileDrag(event)) return;
            event.preventDefault();
            setDraggingFile(true);
          },
          onDragLeave: (event: DragEvent) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDraggingFile(false);
            }
          },
          onDrop: (event: DragEvent) => {
            const file = event.dataTransfer.files[0];
            if (!file) return;
            event.preventDefault();
            setDraggingFile(false);
            openFile(file);
          },
        }
      : {};

  const clearButton = (
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
  );

  return (
    // Arrastar arquivos é um atalho; "Importar planilha" oferece a mesma ação pelo teclado.
    <section
      aria-labelledby="participantes-titulo"
      className={cx(styles.panel, fill && styles.fill, draggingFile && styles.dropTarget)}
      {...dropHandlers}
    >
      <div className={styles.header}>
        <h2 id="participantes-titulo" className={cx(styles.title, hideTitle && "visually-hidden")}>
          Participantes <span className={`${styles.count} numeric`}>{formatNumber(total)}</span>
        </h2>
        {total > 0 ? (
          <div className={styles.headerActions}>
            <Button
              size="sm"
              icon="clipboard"
              onClick={() => {
                setDialog("paste");
              }}
            >
              Colar lista
            </Button>
            <Button
              size="sm"
              icon="upload"
              onClick={() => {
                openFile(null);
              }}
            >
              Importar planilha
            </Button>
            {fill ? clearButton : null}
          </div>
        ) : null}
      </div>

      <div className={styles.fields}>
        <AddParticipantForm />
        {total > 0 ? (
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
        ) : null}
      </div>

      {total === 0 ? (
        <ImportStart
          onPaste={() => {
            setDialog("paste");
          }}
          onFile={openFile}
        />
      ) : (
        <>
          {duplicateCount > 0 ? (
            <div className={styles.notices}>
              {!onlyDuplicates ? (
                <InlineAlert tone="warning">
                  {countLabel(duplicateCount, "participante tem", "participantes têm")} nome
                  repetido. Podem ser pessoas diferentes; revise e exclua se for a mesma pessoa.
                </InlineAlert>
              ) : null}
              <Switch
                label={`Mostrar só possíveis duplicados (${formatNumber(duplicateCount)})`}
                checked={onlyDuplicates}
                onChange={setOnlyDuplicates}
              />
            </div>
          ) : null}

          <p className={styles.resultCount} aria-live="polite">
            {filtering
              ? `${formatNumber(filtered.length)} de ${formatNumber(total)} participantes`
              : ""}
          </p>

          <div className={styles.listArea}>
            {filtered.length === 0 ? (
              <p className={styles.noResults}>
                {deferredQuery.trim()
                  ? `Nenhum participante com “${deferredQuery.trim()}”. Confira a grafia ou limpe o filtro.`
                  : "Nenhum participante corresponde ao filtro."}
              </p>
            ) : (
              <ParticipantList
                items={filtered}
                positions={positions}
                duplicates={duplicates}
                scroll={fill ? "element" : "window"}
                onEdit={setEditing}
                onRemove={removeParticipant}
              />
            )}
          </div>
          {/* No celular, ações sobre a lista inteira ficam no fim dela. */}
          {fill ? null : <div className={styles.listFooter}>{clearButton}</div>}
        </>
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
          initialFile={droppedFile}
          onClose={() => {
            setDialog(null);
            setDroppedFile(null);
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

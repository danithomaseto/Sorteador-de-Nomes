import { useRef, useState, type DragEvent } from "react";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import { Dialog } from "~/components/Dialog";
import { SelectField } from "~/components/Field";
import { Icon } from "~/components/Icon";
import { InlineAlert } from "~/components/InlineAlert";
import { Spinner } from "~/components/Spinner";
import { api, type FileImportQuery } from "~/lib/api/client";
import { errorMessage } from "~/lib/api/messages";
import { countLabel, formatBytes } from "~/lib/format";
import { useAsyncAction } from "~/lib/useAsyncAction";
import { useLimits } from "~/lib/useLimits";
import styles from "./FileImportDialog.module.css";
import { ImportPreviewView } from "./ImportPreviewView";
import { TableOptions, type TableOptionsValue } from "./TableOptions";
import { useImportConfirm } from "./useImportConfirm";

type Delimiter = NonNullable<FileImportQuery["delimiter"]>;

const ACCEPT = ".xlsx,.xlsm,.csv,.txt,.tsv";
const DELIMITERS: { value: Delimiter; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "semicolon", label: "Ponto e vírgula (;)" },
  { value: "comma", label: "Vírgula (,)" },
  { value: "tab", label: "Tabulação" },
  { value: "none", label: "Nenhum (uma pessoa por linha)" },
];
const DETECTED: Record<string, string> = {
  semicolon: "ponto e vírgula",
  comma: "vírgula",
  tab: "tabulação",
  none: "nenhum",
};

function formatFor(fileName: string): "xlsx" | "csv" | null {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (extension === "xlsx" || extension === "xlsm") return "xlsx";
  if (extension === "csv" || extension === "txt" || extension === "tsv") return "csv";
  return null;
}

interface Options extends TableOptionsValue {
  delimiter?: Delimiter;
}

/**
 * Importar planilha: o arquivo fica só na memória desta aba; cada pré-visualização o envia para
 * ser lido em memória no servidor, sem ser gravado.
 */
export function FileImportDialog({ onClose }: { onClose: () => void }) {
  const limits = useLimits();
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<Options>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parse = useAsyncAction((signal, target: File, query: FileImportQuery) =>
    api.importFile(target, query, signal),
  );
  const preview = file ? parse.data : null;
  const confirm = useImportConfirm(preview, preview?.source === "xlsx" ? "xlsx" : "csv", onClose);

  function read(target: File, next: Options) {
    setOptions(next);
    void parse.run(target, {
      format: formatFor(target.name),
      sheet: next.sheet ?? null,
      column: next.column ?? null,
      header: next.header ?? "auto",
      delimiter: next.delimiter ?? "auto",
    });
  }

  function choose(target: File | undefined) {
    if (!target) return;
    parse.reset();
    if (!formatFor(target.name)) {
      setFile(null);
      setLocalError("Envie uma planilha do Excel (.xlsx) ou um arquivo .csv.");
      return;
    }
    if (target.size > limits.max_upload_bytes) {
      setFile(null);
      setLocalError(
        `O arquivo tem ${formatBytes(target.size)} e o limite é ${formatBytes(limits.max_upload_bytes)}. Remova colunas ou abas desnecessárias, ou divida a lista.`,
      );
      return;
    }
    setLocalError(null);
    setFile(target);
    read(target, {});
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  }

  const firstRead = parse.pending && !parse.data;
  const failed = parse.status === "error" || localError !== null;

  return (
    <Dialog
      open
      size="lg"
      title="Importar planilha"
      onClose={onClose}
      description="Arquivos .xlsx (Excel) ou .csv. O arquivo é lido apenas para montar a lista e não fica guardado."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          {preview ? (
            <Button
              variant="primary"
              icon="plus"
              disabled={!confirm.canConfirm || parse.pending}
              onClick={confirm.confirm}
            >
              {confirm.count > 0
                ? `Adicionar ${countLabel(confirm.count, "participante", "participantes")}`
                : "Adicionar"}
            </Button>
          ) : null}
        </>
      }
    >
      {!file || failed ? (
        // Arrastar e soltar é um atalho para mouse; o campo de arquivo dentro desta área
        // oferece a mesma ação pelo teclado.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          className={cx(styles.dropzone, dragging && styles.dragging)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={onDrop}
        >
          <Icon name="upload" size={28} />
          <p className={styles.dropTitle}>Arraste o arquivo para cá</p>
          <p className={styles.dropHint}>
            ou{" "}
            <label className={styles.pick}>
              escolha no computador
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className={styles.fileInput}
                onChange={(event) => {
                  choose(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </p>
          <p className={styles.dropHint}>
            .xlsx ou .csv, até {formatBytes(limits.max_upload_bytes)}
          </p>
        </div>
      ) : null}

      {localError ? (
        <InlineAlert tone="error" title="Arquivo não aceito" live>
          {localError}
        </InlineAlert>
      ) : null}

      {parse.status === "error" ? (
        <InlineAlert tone="error" title="Não foi possível importar o arquivo" live>
          {errorMessage(parse.error)}
        </InlineAlert>
      ) : null}

      {file && firstRead ? (
        <div className={styles.loading} role="status">
          <Spinner size={24} />
          <div>
            <p className={styles.fileName}>{file.name}</p>
            <p className={styles.dropHint}>Lendo {formatBytes(file.size)}…</p>
          </div>
          <Button size="sm" onClick={parse.cancel}>
            Cancelar
          </Button>
        </div>
      ) : null}

      {file && preview && confirm.selection && !failed ? (
        <div className={styles.result} aria-busy={parse.pending}>
          <div className={styles.fileRow}>
            <Icon name="file" />
            <span className={styles.fileName}>{file.name}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                inputRef.current?.click();
              }}
            >
              Trocar arquivo
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="visually-hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                choose(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
          <TableOptions
            preview={preview}
            disabled={parse.pending}
            onChange={(changes) => {
              read(file, { ...options, ...changes });
            }}
          />
          {preview.source === "csv" ? (
            <SelectField
              label="Separador de colunas"
              value={options.delimiter ?? "auto"}
              hint={
                (options.delimiter ?? "auto") === "auto" && preview.separator
                  ? `Detectado automaticamente: ${DETECTED[preview.separator] ?? preview.separator}.`
                  : undefined
              }
              options={DELIMITERS}
              disabled={parse.pending}
              onChange={(event) => {
                read(file, { delimiter: event.target.value as Delimiter });
              }}
            />
          ) : null}
          <ImportPreviewView
            preview={preview}
            selection={confirm.selection}
            existingKeys={confirm.existingKeys}
            policy={confirm.policy}
            onPolicyChange={confirm.setPolicy}
            rowLabel="Linha"
          />
          {confirm.limitMessage ? (
            <InlineAlert tone="error" live>
              {confirm.limitMessage}
            </InlineAlert>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}

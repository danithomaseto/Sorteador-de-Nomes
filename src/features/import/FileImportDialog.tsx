import { useEffect, useRef, useState, type DragEvent } from "react";
import { Button } from "~/components/Button";
import { cx } from "~/components/cx";
import { Dialog } from "~/components/Dialog";
import { SelectField } from "~/components/Field";
import { Icon } from "~/components/Icon";
import { InlineAlert } from "~/components/InlineAlert";
import { Spinner } from "~/components/Spinner";
import { LIMITS } from "~/config";
import { importFile, type DelimiterOption } from "~/services/import";
import { countLabel, formatBytes } from "~/utils/format";
import { useAsyncAction } from "~/utils/useAsyncAction";
import styles from "./FileImportDialog.module.css";
import { importErrorMessage } from "./importErrors";
import { ImportPreviewView } from "./ImportPreviewView";
import { TableOptions, type TableOptionsValue } from "./TableOptions";
import { useImportConfirm } from "./useImportConfirm";

export const ACCEPTED_FILES = ".xlsx,.xls,.csv,.txt";
const ACCEPTED_EXTENSIONS = new Set(["xlsx", "xls", "csv", "txt", "tsv"]);
const DELIMITERS: { value: DelimiterOption; label: string }[] = [
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

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

/** Verificações instantâneas, antes de ler o conteúdo. */
function fileProblem(file: File): string | null {
  if (!ACCEPTED_EXTENSIONS.has(extensionOf(file.name))) {
    return "Use uma planilha do Excel (.xlsx ou .xls) ou um arquivo .csv.";
  }
  if (file.size > LIMITS.maxFileBytes) {
    return `O arquivo tem ${formatBytes(file.size)} e o limite é ${formatBytes(LIMITS.maxFileBytes)}. Remova colunas ou abas desnecessárias, ou divida a lista.`;
  }
  return null;
}

interface Options extends TableOptionsValue {
  delimiter?: DelimiterOption;
}

interface FileImportDialogProps {
  /** Arquivo já escolhido (ex.: arrastado para a lista de participantes). */
  initialFile?: File | null;
  onClose: () => void;
}

/**
 * Importar planilha: o arquivo é lido no próprio navegador, num processo separado da tela, e
 * nunca é enviado a lugar nenhum. Nada é adicionado sem a revisão e a confirmação da pessoa.
 */
export function FileImportDialog({ initialFile = null, onClose }: FileImportDialogProps) {
  const [file, setFile] = useState<File | null>(() =>
    initialFile && fileProblem(initialFile) === null ? initialFile : null,
  );
  const [options, setOptions] = useState<Options>({});
  const [localError, setLocalError] = useState<string | null>(() =>
    initialFile ? fileProblem(initialFile) : null,
  );
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parse = useAsyncAction((signal, target: File, next: Options) =>
    importFile(
      target,
      {
        sheet: next.sheet ?? null,
        column: next.column ?? null,
        header: next.header ?? "auto",
        delimiter: next.delimiter ?? "auto",
      },
      signal,
    ),
  );
  const preview = file ? parse.data : null;
  const confirm = useImportConfirm(
    preview,
    preview?.source === "xls" ? "xls" : preview?.source === "xlsx" ? "xlsx" : "csv",
    onClose,
  );

  function read(target: File, next: Options) {
    setOptions(next);
    void parse.run(target, next);
  }

  function choose(target: File | undefined) {
    if (!target) return;
    parse.reset();
    const problem = fileProblem(target);
    setLocalError(problem);
    setFile(problem ? null : target);
    if (!problem) read(target, {});
  }

  // Arquivo arrastado para a lista: a leitura começa assim que a janela abre.
  const initialRead = useRef(false);
  useEffect(() => {
    if (initialRead.current || !file || file !== initialFile) return;
    initialRead.current = true;
    void parse.run(file, {});
  }, [file, initialFile, parse]);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  }

  const firstRead = parse.pending && !parse.data;
  const failed = parse.status === "error" || localError !== null;
  const failure = parse.status === "error" ? importErrorMessage(parse.error) : null;

  return (
    <Dialog
      open
      size="lg"
      title="Importar planilha"
      onClose={onClose}
      description="Arquivos .xlsx ou .xls (Excel) e .csv. O arquivo é lido no seu navegador e não é enviado para nenhum servidor."
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
                accept={ACCEPTED_FILES}
                className={styles.fileInput}
                onChange={(event) => {
                  choose(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </p>
          <p className={styles.dropHint}>
            .xlsx, .xls ou .csv, até {formatBytes(LIMITS.maxFileBytes)}
          </p>
        </div>
      ) : null}

      {localError ? (
        <InlineAlert tone="error" title="Arquivo não aceito" live>
          {localError}
        </InlineAlert>
      ) : null}

      {failure ? (
        <InlineAlert tone="error" title={failure.title} live>
          {failure.message}
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
              accept={ACCEPTED_FILES}
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
                read(file, { delimiter: event.target.value as DelimiterOption });
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

import { useRef, useState } from "react";
import { Button } from "~/components/Button";
import { Dialog } from "~/components/Dialog";
import { SelectField, TextArea } from "~/components/Field";
import { InlineAlert } from "~/components/InlineAlert";
import { importText, type SeparatorOption, type TextImportOptions } from "~/services/import";
import { countLabel } from "~/utils/format";
import { useAsyncAction } from "~/utils/useAsyncAction";
import { importErrorMessage } from "./importErrors";
import { ImportPreviewView } from "./ImportPreviewView";
import { TableOptions, type TableOptionsValue } from "./TableOptions";
import { useImportConfirm } from "./useImportConfirm";

type Separator = SeparatorOption;

const SEPARATORS: { value: Separator; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "newline", label: "Uma pessoa por linha" },
  { value: "semicolon", label: "Ponto e vírgula (;)" },
  { value: "comma", label: "Vírgula (,)" },
];

const DETECTED: Record<string, string> = {
  newline: "uma pessoa por linha",
  semicolon: "ponto e vírgula",
  comma: "vírgula",
  tab: "colunas de planilha",
};

/** Colar lista → revisar (pré-visualização) → confirmar. Nada é adicionado sem confirmação. */
export function PasteDialog({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [separator, setSeparator] = useState<Separator>("auto");
  const [table, setTable] = useState<TableOptionsValue>({});
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [emptyError, setEmptyError] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const parse = useAsyncAction((signal, input: string, options: TextImportOptions) =>
    importText(input, options, signal),
  );
  const preview = step === "review" ? parse.data : null;
  const confirm = useImportConfirm(preview, "paste", onClose);

  async function review(options: { separator?: Separator; table?: TableOptionsValue } = {}) {
    if (!text.trim()) {
      setEmptyError(true);
      textRef.current?.focus();
      return;
    }
    const nextSeparator = options.separator ?? separator;
    const nextTable = options.table ?? table;
    setSeparator(nextSeparator);
    setTable(nextTable);
    const result = await parse.run(text, {
      separator: nextSeparator,
      column: nextTable.column ?? null,
      header: nextTable.header ?? "auto",
    });
    if (result) setStep("review");
  }

  const footer =
    step === "edit" ? (
      <>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="primary"
          loading={parse.pending}
          onClick={() => {
            void review();
          }}
        >
          Revisar lista
        </Button>
      </>
    ) : (
      <>
        <Button
          icon="arrow-left"
          onClick={() => {
            setStep("edit");
          }}
        >
          Voltar e editar
        </Button>
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
      </>
    );

  return (
    <Dialog
      open
      size="lg"
      title="Colar lista de participantes"
      onClose={onClose}
      initialFocusRef={textRef}
      footer={footer}
      description={
        step === "edit"
          ? "Cole os nomes separados por linha, vírgula ou ponto e vírgula. Você revisa antes de adicionar."
          : undefined
      }
    >
      {step === "edit" ? (
        <>
          <TextArea
            ref={textRef}
            label="Nomes"
            placeholder={"João Silva\nMaria Souza\nCarlos Lima"}
            value={text}
            rows={10}
            spellCheck={false}
            error={emptyError ? "Cole ou digite pelo menos um nome." : undefined}
            onChange={(event) => {
              setText(event.target.value);
              setEmptyError(false);
            }}
          />
          <SelectField
            label="Separar por"
            value={separator}
            options={SEPARATORS}
            onChange={(event) => {
              setSeparator(event.target.value as Separator);
            }}
          />
        </>
      ) : null}

      {parse.status === "error" ? (
        <InlineAlert tone="error" title={importErrorMessage(parse.error).title} live>
          {importErrorMessage(parse.error).message}
        </InlineAlert>
      ) : null}

      {preview && confirm.selection ? (
        <>
          <SelectField
            label="Separar por"
            hint={
              preview.separator && separator === "auto"
                ? `Detectado automaticamente: ${DETECTED[preview.separator] ?? preview.separator}.`
                : undefined
            }
            value={separator}
            options={SEPARATORS}
            disabled={parse.pending}
            onChange={(event) => {
              void review({ separator: event.target.value as Separator, table: {} });
            }}
          />
          <TableOptions
            preview={preview}
            disabled={parse.pending}
            onChange={(changes) => {
              void review({ table: { ...table, ...changes } });
            }}
          />
          <ImportPreviewView
            preview={preview}
            selection={confirm.selection}
            existingKeys={confirm.existingKeys}
            policy={confirm.policy}
            onPolicyChange={confirm.setPolicy}
            rowLabel={
              preview.separator === "comma" || preview.separator === "semicolon" ? "Item" : "Linha"
            }
          />
          {confirm.limitMessage ? (
            <InlineAlert tone="error" live>
              {confirm.limitMessage}
            </InlineAlert>
          ) : null}
        </>
      ) : null}
    </Dialog>
  );
}

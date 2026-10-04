import { SelectField } from "~/components/Field";
import { Switch } from "~/components/Switch";
import type { ImportPreview } from "~/services/import";
import styles from "./TableOptions.module.css";

export interface TableOptionsValue {
  sheet?: number;
  column?: number;
  header?: "auto" | "yes" | "no";
}

interface TableOptionsProps {
  preview: ImportPreview;
  disabled?: boolean;
  onChange: (changes: TableOptionsValue) => void;
}

/** Aba, coluna e cabeçalho — a detecção automática é só uma sugestão. */
export function TableOptions({ preview, disabled, onChange }: TableOptionsProps) {
  if (preview.columns.length === 0 && preview.sheets.length <= 1) return null;
  const column = preview.columns.find((c) => c.index === preview.column);
  return (
    <div className={styles.options}>
      {preview.sheets.length > 1 ? (
        <SelectField
          label="Aba da planilha"
          value={String(preview.sheet ?? 0)}
          disabled={disabled}
          options={preview.sheets.map((sheet) => ({
            value: String(sheet.index),
            label: sheet.hidden ? `${sheet.name} (oculta)` : sheet.name,
          }))}
          onChange={(event) => {
            onChange({ sheet: Number(event.target.value), column: undefined, header: "auto" });
          }}
        />
      ) : null}
      {preview.columns.length > 0 ? (
        <SelectField
          label="Qual coluna contém os participantes?"
          value={String(preview.column ?? 0)}
          disabled={disabled}
          hint={
            column && column.samples.length > 0 ? `Ex.: ${column.samples.join(", ")}` : undefined
          }
          options={preview.columns.map((c) => ({
            value: String(c.index),
            label: c.label === `Coluna ${c.letter}` ? c.label : `${c.label} (coluna ${c.letter})`,
          }))}
          onChange={(event) => {
            onChange({ column: Number(event.target.value) });
          }}
        />
      ) : null}
      {preview.columns.length > 0 ? (
        <Switch
          label="A primeira linha é cabeçalho"
          description="Desative se a primeira linha já for um participante."
          checked={preview.hasHeader}
          disabled={disabled}
          onChange={(checked) => {
            onChange({ header: checked ? "yes" : "no" });
          }}
        />
      ) : null}
    </div>
  );
}

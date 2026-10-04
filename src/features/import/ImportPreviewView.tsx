import { InlineAlert } from "~/components/InlineAlert";
import { SegmentedControl } from "~/components/SegmentedControl";
import type { ImportPreview } from "~/services/import";
import { countLabel, formatNumber } from "~/utils/format";
import type { DuplicatePolicy, ImportSelection } from "./importSelection";
import styles from "./ImportPreviewView.module.css";

const PREVIEW_ROWS = 100;
const LISTED_ISSUES = 5;

interface ImportPreviewViewProps {
  preview: ImportPreview;
  selection: ImportSelection;
  existingKeys: ReadonlySet<string>;
  policy: DuplicatePolicy;
  onPolicyChange: (policy: DuplicatePolicy) => void;
  /** "linha" para arquivos e linhas de texto; "item" quando o texto é separado por vírgula. */
  rowLabel: "Linha" | "Item";
}

export function ImportPreviewView({
  preview,
  selection,
  existingKeys,
  policy,
  onPolicyChange,
  rowLabel,
}: ImportPreviewViewProps) {
  const { stats } = preview;
  const isTable = preview.columns.length > 0;
  const duplicates = selection.repeatedInSource + selection.alreadyInList;

  if (stats.valid === 0) {
    return (
      <InlineAlert tone="error" title="Nenhum nome encontrado" live>
        {isTable
          ? "Esta coluna não tem nomes. Escolha outra coluna ou aba."
          : "Não encontramos nomes no texto. Verifique o conteúdo e o separador."}
      </InlineAlert>
    );
  }

  return (
    <div className={styles.preview}>
      <p className={styles.found} role="status">
        <strong>
          {countLabel(stats.valid, "participante encontrado", "participantes encontrados")}
        </strong>
        {stats.empty > 0 ? (
          <span className={styles.muted}>
            {" "}
            · {countLabel(stats.empty, "linha vazia ignorada", "linhas vazias ignoradas")}
          </span>
        ) : null}
      </p>

      {stats.invalid > 0 ? (
        <InlineAlert
          tone="warning"
          title={countLabel(
            stats.invalid,
            "linha não será importada",
            "linhas não serão importadas",
          )}
        >
          <ul className={styles.issues}>
            {preview.issues.slice(0, LISTED_ISSUES).map((issue) => (
              <li key={issue.row}>
                {rowLabel} {formatNumber(issue.row)}:{" "}
                {issue.code === "too_long"
                  ? `nome com mais de ${String(preview.maxNameLength)} caracteres`
                  : "célula com erro de fórmula (ex.: #N/A)"}
              </li>
            ))}
            {stats.invalid > LISTED_ISSUES ? (
              <li>e mais {formatNumber(stats.invalid - LISTED_ISSUES)}.</li>
            ) : null}
          </ul>
        </InlineAlert>
      ) : null}

      {stats.dates > 0 ? (
        <InlineAlert tone="warning" title="Alguns valores parecem datas">
          {countLabel(stats.dates, "valor parece", "valores parecem")} data. Confira se a coluna
          escolhida é a dos nomes.
        </InlineAlert>
      ) : null}

      {duplicates > 0 ? (
        <InlineAlert
          tone="warning"
          title={
            policy === "skip-repeated"
              ? countLabel(
                  duplicates,
                  "nome duplicado será ignorado",
                  "nomes duplicados serão ignorados",
                )
              : countLabel(
                  duplicates,
                  "nome duplicado será mantido",
                  "nomes duplicados serão mantidos",
                )
          }
        >
          <p>
            {selection.repeatedInSource > 0
              ? `${countLabel(selection.repeatedInSource, "nome aparece", "nomes aparecem")} mais de uma vez. `
              : ""}
            {selection.alreadyInList > 0
              ? `${countLabel(selection.alreadyInList, "nome já está", "nomes já estão")} na lista. `
              : ""}
            {policy === "skip-repeated"
              ? "Só a primeira ocorrência entra no sorteio. Se forem pessoas diferentes com o mesmo nome, mantenha todos."
              : "Todos entram no sorteio e ficam marcados como possíveis duplicados na lista."}
          </p>
          <SegmentedControl<DuplicatePolicy>
            legend="Nomes repetidos"
            hideLegend
            className={styles.policy}
            value={policy}
            onChange={onPolicyChange}
            options={[
              { value: "skip-repeated", label: "Ignorar repetidos" },
              { value: "keep-all", label: "Manter todos" },
            ]}
          />
        </InlineAlert>
      ) : null}

      <div
        className={styles.tableWrap}
        tabIndex={0}
        role="region"
        aria-label="Prévia dos participantes"
      >
        <table className={styles.table}>
          <caption className="visually-hidden">Prévia dos participantes encontrados</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.rowCol}>
                {rowLabel}
              </th>
              <th scope="col">Nome</th>
              <th scope="col" className={styles.noteCol}>
                Observação
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.entries.slice(0, PREVIEW_ROWS).map((entry) => (
              <tr key={entry.row}>
                <td className="numeric">{formatNumber(entry.row)}</td>
                <td>{entry.name}</td>
                <td className={styles.note}>
                  {entry.repeatOf !== null
                    ? `Repete ${rowLabel.toLowerCase()} ${formatNumber(entry.repeatOf)}`
                    : existingKeys.has(entry.key)
                      ? "Já está na lista"
                      : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.entries.length > PREVIEW_ROWS ? (
        <p className={styles.muted}>
          Mostrando {formatNumber(PREVIEW_ROWS)} de {formatNumber(preview.entries.length)}.
        </p>
      ) : null}
    </div>
  );
}

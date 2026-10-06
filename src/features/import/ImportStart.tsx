import { useId, useState, type DragEvent } from "react";
import { cx } from "~/components/cx";
import { Icon } from "~/components/Icon";
import { LIMITS } from "~/config";
import { formatBytes } from "~/utils/format";
import { ACCEPTED_FILES } from "./FileImportDialog";
import styles from "./ImportStart.module.css";

interface ImportStartProps {
  onPaste: () => void;
  onFile: (file: File) => void;
}

/** Estado inicial da lista: os dois jeitos mais rápidos de trazer muitos nomes de uma vez. */
export function ImportStart({ onPaste, onFile }: ImportStartProps) {
  const [dragging, setDragging] = useState(false);
  const id = useId();

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div className={styles.start}>
      <div className={styles.options}>
        <button
          type="button"
          className={styles.option}
          aria-labelledby={`${id}-colar`}
          aria-describedby={`${id}-colar-ajuda`}
          onClick={onPaste}
        >
          <span className={styles.icon}>
            <Icon name="clipboard" size={24} />
          </span>
          <span id={`${id}-colar`} className={styles.title}>
            Colar uma lista
          </span>
          <span id={`${id}-colar-ajuda`} className={styles.hint}>
            Copie os nomes de uma planilha, e-mail ou documento. Um por linha, ou separados por
            vírgula.
          </span>
        </button>

        {/* Arrastar é um atalho; o campo de arquivo dentro do rótulo faz o mesmo pelo teclado. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <label
          className={cx(styles.option, styles.drop, dragging && styles.dragging)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={onDrop}
        >
          <span className={styles.icon}>
            <Icon name="upload" size={24} />
          </span>
          <span id={`${id}-arquivo`} className={styles.title}>
            Importar planilha
          </span>
          <span id={`${id}-arquivo-ajuda`} className={styles.hint}>
            Arraste um arquivo .xlsx, .xls ou .csv para cá, ou clique para escolher (até{" "}
            {formatBytes(LIMITS.maxFileBytes)}).
          </span>
          <input
            type="file"
            accept={ACCEPTED_FILES}
            className={styles.fileInput}
            aria-labelledby={`${id}-arquivo`}
            aria-describedby={`${id}-arquivo-ajuda`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />
        </label>
      </div>

      <p className={styles.privacy}>
        <Icon name="lock" size={16} />
        Os nomes e os arquivos são lidos neste navegador e não são enviados para nenhum servidor.
      </p>
    </div>
  );
}

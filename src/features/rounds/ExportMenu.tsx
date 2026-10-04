import { useEffect, useId, useRef, useState } from "react";
import { Button, type ButtonSize } from "~/components/Button";
import { cx } from "~/components/cx";
import { useToast } from "~/components/Toast";
import type { Round } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import { createExport, downloadFile, type ExportFormat } from "~/services/export";
import { userTimeZone } from "~/utils/format";
import styles from "./ExportMenu.module.css";

interface ExportMenuProps {
  rounds: readonly Round[];
  label?: string;
  size?: ButtonSize;
  /** Lado em que a lista de formatos se alinha ao botão. */
  align?: "start" | "end";
}

const FORMATS: readonly { format: ExportFormat; label: string }[] = [
  { format: "xlsx", label: "Excel (.xlsx)" },
  { format: "csv", label: "CSV (.csv)" },
  { format: "txt", label: "Texto (.txt)" },
];

/** Botão que revela as opções de formato (padrão "disclosure"). O arquivo é gerado no navegador. */
export function ExportMenu({
  rounds,
  label = "Exportar",
  size = "md",
  align = "start",
}: ExportMenuProps) {
  const { state } = useSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function download(format: ExportFormat) {
    setOpen(false);
    try {
      downloadFile(
        createExport(
          { drawName: state.name, timeZone: userTimeZone(), generatedAt: new Date(), rounds },
          format,
        ),
      );
      toast({ tone: "success", message: "Arquivo gerado no seu dispositivo." });
    } catch {
      toast({ tone: "error", message: "Não foi possível gerar o arquivo. Tente outro formato." });
    }
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <Button
        size={size}
        icon="download"
        iconEnd="chevron-down"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {label}
      </Button>
      <div id={panelId} className={cx(styles.panel, styles[align])} hidden={!open}>
        {FORMATS.map(({ format, label: formatLabel }) => (
          <Button
            key={format}
            variant="ghost"
            fullWidth
            icon="file"
            className={styles.option}
            onClick={() => {
              download(format);
            }}
          >
            {formatLabel}
          </Button>
        ))}
      </div>
    </div>
  );
}

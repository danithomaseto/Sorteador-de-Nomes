import { useEffect, useId, useRef, useState } from "react";
import { Button, type ButtonSize } from "~/components/Button";
import { useToast } from "~/components/Toast";
import type { Round } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import { api, type ExportFormat } from "~/lib/api/client";
import { errorMessage } from "~/lib/api/messages";
import { useAsyncAction } from "~/lib/useAsyncAction";
import styles from "./ExportMenu.module.css";
import { buildExportRequest, downloadBlob, exportFileName } from "./exportFile";

interface ExportMenuProps {
  rounds: readonly Round[];
  label?: string;
  size?: ButtonSize;
}

/** Botão que revela as opções de formato (padrão "disclosure"). */
export function ExportMenu({ rounds, label = "Exportar", size = "md" }: ExportMenuProps) {
  const { state } = useSession();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const exporting = useAsyncAction((signal, format: ExportFormat) =>
    api.exportFile(format, buildExportRequest(state.name, rounds), signal),
  );

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

  async function download(format: ExportFormat) {
    setOpen(false);
    const blob = await exporting.run(format);
    if (blob) {
      downloadBlob(blob, exportFileName(state.name, rounds, format));
      toast({ tone: "success", message: "Arquivo gerado. Ele não fica guardado no serviço." });
    }
  }

  useEffect(() => {
    if (exporting.status === "error")
      toast({ tone: "error", message: errorMessage(exporting.error) });
  }, [exporting.error, exporting.status, toast]);

  return (
    <div ref={rootRef} className={styles.root}>
      <Button
        size={size}
        icon="download"
        iconEnd="chevron-down"
        loading={exporting.pending}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {label}
      </Button>
      <div id={panelId} className={styles.panel} hidden={!open}>
        <Button
          variant="ghost"
          fullWidth
          icon="file"
          className={styles.option}
          onClick={() => {
            void download("xlsx");
          }}
        >
          Excel (.xlsx)
        </Button>
        <Button
          variant="ghost"
          fullWidth
          icon="file"
          className={styles.option}
          onClick={() => {
            void download("csv");
          }}
        >
          CSV (.csv)
        </Button>
      </div>
    </div>
  );
}

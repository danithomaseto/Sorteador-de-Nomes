import { useEffect, useId, useRef, useState } from "react";
import { Button, type ButtonSize } from "~/components/Button";
import { cx } from "~/components/cx";
import { useToast } from "~/components/Toast";
import type { Round } from "~/features/session/model";
import { useSession } from "~/features/session/SessionProvider";
import {
  createExport,
  downloadFile,
  exportFileName,
  renderResultImage,
  type ExportDocument,
  type ExportFormat,
} from "~/services/export";
import { userTimeZone } from "~/utils/format";
import styles from "./ExportMenu.module.css";

interface ExportMenuProps {
  rounds: readonly Round[];
  label?: string;
  size?: ButtonSize;
  /** Lado em que a lista de formatos se alinha ao botão. */
  align?: "start" | "end";
  /** Tela de uma rodada: também oferece PDF (impressão) e imagem para compartilhar. */
  single?: boolean;
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
  single = false,
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

  function exportDocument(): ExportDocument {
    return { drawName: state.name, timeZone: userTimeZone(), generatedAt: new Date(), rounds };
  }

  function download(format: ExportFormat) {
    setOpen(false);
    try {
      downloadFile(createExport(exportDocument(), format));
      toast({ tone: "success", message: "Arquivo gerado no seu dispositivo." });
    } catch {
      toast({ tone: "error", message: "Não foi possível gerar o arquivo. Tente outro formato." });
    }
  }

  async function downloadImage() {
    setOpen(false);
    const [round] = rounds;
    if (!round) return;
    try {
      const blob = await renderResultImage({
        drawName: state.name,
        round,
        timeZone: userTimeZone(),
      });
      downloadFile({ blob, fileName: exportFileName(exportDocument(), "png") });
      toast({ tone: "success", message: "Imagem gerada no seu dispositivo." });
    } catch {
      toast({ tone: "error", message: "Não foi possível gerar a imagem. Tente outro formato." });
    }
  }

  function print() {
    setOpen(false);
    // Espera o menu fechar antes de abrir a janela de impressão.
    window.requestAnimationFrame(() => {
      window.print();
    });
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
        {single ? (
          <>
            <Button
              variant="ghost"
              fullWidth
              icon="printer"
              className={styles.option}
              onClick={print}
            >
              PDF ou impressão
            </Button>
            <Button
              variant="ghost"
              fullWidth
              icon="image"
              className={styles.option}
              onClick={() => {
                void downloadImage();
              }}
            >
              Imagem (.png)
            </Button>
          </>
        ) : null}
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

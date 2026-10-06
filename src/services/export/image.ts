/**
 * Imagem do resultado (PNG) para compartilhar em chats e redes sociais, desenhada num <canvas> no
 * próprio navegador, com a identidade do produto. Nada é enviado: o arquivo vai direto para
 * download.
 */
import { APP_NAME } from "~/config";
import { countLabel, formatNumber } from "~/utils/format";
import { localDateTime, ordinal, type ExportRound } from "./document";

const WIDTH = 1200;
const HEIGHT = 675;
// Desenhada em 2× para ficar nítida em telas de alta densidade.
const SCALE = 2;
const COLORS = {
  page: "#f6f5f1",
  stage: "#1b1a17",
  text: "#f6f5f1",
  muted: "#a9a69e",
  primary: "#f2b300",
  onPrimary: "#1b1a17",
} as const;
const SANS = '"Archivo Variable", Archivo, system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';
// Mesmo desenho do logotipo (canhoto de bilhete), em coordenadas 32 × 24.
const LOGO_TICKET =
  "M4 3h24a2 2 0 0 1 2 2v3.5a3.5 3.5 0 0 0 0 7V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3.5a3.5 3.5 0 0 0 0-7V5a2 2 0 0 1 2-2Z";
const LOGO_LINES = "M9 9.5h7M9 13.5h4.5";
const LOGO_DASH = "M21 5.5v13";

const CARD = { x: 48, y: 48, width: WIDTH - 96, height: HEIGHT - 96, padding: 48 } as const;
const CONTENT_WIDTH = CARD.width - CARD.padding * 2;
const ROWS_PER_COLUMN = 6;
const MAX_LISTED = ROWS_PER_COLUMN * 2;

export interface ResultImageInput {
  readonly drawName: string;
  readonly round: ExportRound;
  readonly timeZone: string;
}

export async function renderResultImage(input: ResultImageInput): Promise<Blob> {
  // As fontes do site já estão na página; garante que estejam prontas antes de desenhar.
  await Promise.all([
    document.fonts.load(`700 40px ${SANS}`),
    document.fonts.load(`500 20px ${MONO}`),
  ]).catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível");
  context.scale(SCALE, SCALE);
  drawResult(context, input);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem"));
    }, "image/png");
  });
}

function drawResult(
  context: CanvasRenderingContext2D,
  { drawName, round, timeZone }: ResultImageInput,
) {
  context.fillStyle = COLORS.page;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  roundedRect(context, CARD.x, CARD.y, CARD.width, CARD.height, 24, COLORS.stage);
  // Recortes laterais do bilhete.
  context.fillStyle = COLORS.page;
  for (const x of [CARD.x, CARD.x + CARD.width]) {
    context.beginPath();
    context.arc(x, CARD.y + CARD.height / 2, 16, 0, Math.PI * 2);
    context.fill();
  }

  const left = CARD.x + CARD.padding;
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  spacedText(context, `RESULTADO · RODADA ${String(round.number)}`, left, CARD.y + 72, {
    font: `700 17px ${SANS}`,
    color: COLORS.primary,
    spacing: 2.6,
  });
  context.font = `600 26px ${SANS}`;
  context.fillStyle = COLORS.text;
  context.fillText(fitText(context, drawName, CONTENT_WIDTH), left, CARD.y + 112);

  if (round.winners.length === 1) drawSingle(context, round.winners[0]?.name ?? "");
  else drawList(context, round);

  drawFooter(context, round, timeZone);
}

function drawSingle(context: CanvasRenderingContext2D, name: string) {
  const centerX = WIDTH / 2;
  const { lines, size } = layoutName(context, name, CONTENT_WIDTH - 56);
  const lineHeight = size * 1.2;
  const bandHeight = lineHeight * lines.length + size * 0.3;
  // Bloco "VENCEDOR" + faixa com o nome + "Parabéns!", centralizado entre o título e o rodapé.
  const blockHeight = 20 + 30 + bandHeight + 34 + 28;
  const top = 352 - blockHeight / 2;
  const bandTop = top + 20 + 30;

  spacedText(context, "VENCEDOR", centerX, top + 20, {
    font: `700 20px ${SANS}`,
    color: COLORS.primary,
    spacing: 3.2,
    align: "center",
  });

  // spacedText desenha letra a letra alinhado à esquerda; o nome e o "Parabéns!" são centralizados.
  context.textAlign = "center";
  context.font = `700 ${String(size)}px ${SANS}`;
  const bandWidth = Math.max(...lines.map((line) => context.measureText(line).width)) + 56;
  roundedRect(context, centerX - bandWidth / 2, bandTop, bandWidth, bandHeight, 14, COLORS.primary);
  context.fillStyle = COLORS.onPrimary;
  context.textBaseline = "middle";
  lines.forEach((line, index) => {
    const middle = bandTop + size * 0.15 + lineHeight * (index + 0.5);
    context.fillText(line, centerX, middle + size * 0.04);
  });

  context.textBaseline = "alphabetic";
  context.font = `400 28px ${SANS}`;
  context.fillStyle = COLORS.muted;
  context.fillText("Parabéns!", centerX, bandTop + bandHeight + 34 + 24);
  context.textAlign = "left";
}

/**
 * Maior tamanho em que o nome cabe numa linha; se não couber, em duas linhas (quebradas num
 * espaço); só em último caso corta com reticências.
 */
function layoutName(
  context: CanvasRenderingContext2D,
  name: string,
  maxWidth: number,
): { lines: string[]; size: number } {
  const fits = (text: string, size: number) => {
    context.font = `700 ${String(size)}px ${SANS}`;
    return context.measureText(text).width <= maxWidth;
  };
  for (let size = 88; size >= 56; size -= 4) {
    if (fits(name, size)) return { lines: [name], size };
  }
  const words = name.split(" ");
  for (let size = 72; size >= 40; size -= 4) {
    for (let split = Math.ceil(words.length / 2); split < words.length; split += 1) {
      const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")];
      if (lines.every((line) => fits(line, size))) return { lines, size };
    }
  }
  context.font = `700 40px ${SANS}`;
  return { lines: [fitText(context, name, maxWidth)], size: 40 };
}

function drawList(context: CanvasRenderingContext2D, round: ExportRound) {
  const winners = round.winners;
  const twoColumns = winners.length > ROWS_PER_COLUMN;
  const columnWidth = twoColumns ? (CONTENT_WIDTH - 32) / 2 : CONTENT_WIDTH;
  const listed = winners.slice(0, winners.length > MAX_LISTED ? MAX_LISTED - 1 : MAX_LISTED);
  const rowHeight = 54;
  const top = 188;

  listed.forEach((winner, index) => {
    const column = Math.floor(index / ROWS_PER_COLUMN);
    const x = CARD.x + CARD.padding + column * (columnWidth + 32);
    const y = top + (index % ROWS_PER_COLUMN) * rowHeight;
    const first = index === 0;
    if (first) roundedRect(context, x - 14, y, columnWidth + 28, rowHeight - 6, 10, COLORS.primary);
    const baseline = y + rowHeight / 2 + 8;
    context.font = `500 20px ${MONO}`;
    context.fillStyle = first ? COLORS.onPrimary : COLORS.muted;
    context.fillText(ordinal(winner.position), x, baseline);
    context.font = `700 ${twoColumns ? "26" : "30"}px ${SANS}`;
    context.fillStyle = first ? COLORS.onPrimary : COLORS.text;
    context.fillText(fitText(context, winner.name, columnWidth - 76), x + 64, baseline);
  });

  if (winners.length > listed.length) {
    const index = listed.length;
    const x = CARD.x + CARD.padding + Math.floor(index / ROWS_PER_COLUMN) * (columnWidth + 32);
    const y = top + (index % ROWS_PER_COLUMN) * rowHeight + rowHeight / 2 + 8;
    context.font = `500 22px ${SANS}`;
    context.fillStyle = COLORS.muted;
    context.fillText(`e mais ${String(winners.length - listed.length)} vencedores`, x + 64, y);
  }
}

function drawFooter(context: CanvasRenderingContext2D, round: ExportRound, timeZone: string) {
  const baseline = CARD.y + CARD.height - CARD.padding + 8;
  const left = CARD.x + CARD.padding;
  context.font = `700 24px ${SANS}`;
  const brandWidth = context.measureText(APP_NAME).width;
  // Logotipo (40 px) + respiro antes do nome.
  const brandBlock = brandWidth + 48;

  context.font = `400 19px ${SANS}`;
  context.fillStyle = COLORS.muted;
  const summary = `${localDateTime(round.drawnAt, timeZone).slice(0, 16)} · ${formatNumber(round.winners.length)} de ${countLabel(round.poolSize, "participante", "participantes")}`;
  context.fillText(fitText(context, summary, CONTENT_WIDTH - brandBlock - 32), left, baseline);

  // Marca no canto direito: logotipo + nome.
  context.font = `700 24px ${SANS}`;
  const right = CARD.x + CARD.width - CARD.padding;
  context.fillStyle = COLORS.text;
  context.fillText(APP_NAME, right - brandWidth, baseline);
  context.save();
  context.translate(right - brandWidth - 48, baseline - 23);
  context.scale(1.25, 1.25);
  context.fillStyle = COLORS.primary;
  context.fill(new Path2D(LOGO_TICKET));
  context.strokeStyle = COLORS.stage;
  context.lineWidth = 1.75;
  context.lineCap = "round";
  context.stroke(new Path2D(LOGO_LINES));
  context.setLineDash([1.5, 2]);
  context.lineWidth = 1.5;
  context.stroke(new Path2D(LOGO_DASH));
  context.restore();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = color;
  context.fill();
}

interface SpacedTextOptions {
  font: string;
  color: string;
  /** Espaço entre letras, em px. */
  spacing: number;
  align?: "left" | "center";
}

/** Texto com espaçamento entre letras (rótulos em caixa alta), sem depender de suporte do canvas. */
function spacedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  { font, color, spacing, align = "left" }: SpacedTextOptions,
) {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = "left";
  const characters = Array.from(text);
  const width =
    characters.reduce((sum, character) => sum + context.measureText(character).width, 0) +
    spacing * (characters.length - 1);
  let cursor = align === "center" ? x - width / 2 : x;
  for (const character of characters) {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + spacing;
  }
}

/** Corta o texto com reticências para caber na largura dada (fonte atual do contexto). */
export function fitText(
  context: Pick<CanvasRenderingContext2D, "measureText">,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) return text;
  const characters = Array.from(text);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${characters.slice(0, middle).join("").trimEnd()}…`;
    if (context.measureText(candidate).width <= maxWidth) low = middle;
    else high = middle - 1;
  }
  return `${characters.slice(0, low).join("").trimEnd()}…`;
}

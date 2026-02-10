import type { GridRow, PuzzleAttribute } from "./types";

type PreparedRow = {
  guessLines: string[];
  valueLinesByAttribute: string[][];
  rowHeight: number;
};

export type SnapshotSummary = {
  line: string;
  filePart: string;
};

const TITLE_FONT = "700 30px 'Segoe UI', sans-serif";
const SUMMARY_FONT = "600 20px 'Segoe UI', sans-serif";
const HEADER_FONT = "700 14px 'Segoe UI', sans-serif";
const BODY_FONT = "650 13px 'Segoe UI', sans-serif";

const PADDING = 24;
const TITLE_BLOCK_HEIGHT = 82;
const CELL_PADDING_X = 10;
const CELL_PADDING_Y = 8;
const HEADER_LINE_HEIGHT = 16;
const BODY_LINE_HEIGHT = 14;
const MIN_HEADER_HEIGHT = 56;
const MIN_ROW_HEIGHT = 52;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getCellColor(status: "green" | "yellow" | "gray"): string {
  if (status === "green") return "#188359";
  if (status === "yellow") return "#c48510";
  return "#5b677d";
}

function normalizeCellText(value: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "-";
}

export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hoursPart = hours > 0 ? `${String(hours).padStart(2, "0")}:` : "";
  return `${hoursPart}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getSnapshotSummary(params: {
  isSolved: boolean;
  isOver: boolean;
  timerStartedAtMs: number | null;
  timerEndedAtMs: number | null;
  nowMs: number;
}): SnapshotSummary {
  if (params.timerStartedAtMs == null) {
    return {
      line: "No guesses yet.",
      filePart: "no-guesses"
    };
  }

  const endMs = params.timerEndedAtMs ?? params.nowMs;
  const elapsed = Math.max(0, endMs - params.timerStartedAtMs);
  const elapsedLabel = formatElapsed(elapsed);
  const elapsedFilePart = elapsedLabel.replace(/:/g, "-");

  if (params.isSolved) {
    return {
      line: `Successfully guessed in ${elapsedLabel}.`,
      filePart: `solved-${elapsedFilePart}`
    };
  }

  if (params.isOver) {
    return {
      line: `Gave up after ${elapsedLabel}.`,
      filePart: `gave-up-${elapsedFilePart}`
    };
  }

  return {
    line: `In progress - elapsed ${elapsedLabel}.`,
    filePart: `in-progress-${elapsedFilePart}`
  };
}

function breakWordToFit(ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";

  for (const char of word) {
    const candidate = `${current}${char}`;
    if (ctx.measureText(candidate).width <= maxWidth || current.length === 0) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = char;
  }

  if (current.length > 0) lines.push(current);
  return lines;
}

function wrapText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const safeMaxWidth = Math.max(18, maxWidth);
  const text = normalizeCellText(value).replace(/\s+/g, " ");
  if (ctx.measureText(text).width <= safeMaxWidth) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;

    if (!currentLine) {
      if (ctx.measureText(word).width <= safeMaxWidth) {
        currentLine = word;
      } else {
        const chunks = breakWordToFit(ctx, word, safeMaxWidth);
        if (chunks.length > 0) {
          lines.push(...chunks.slice(0, -1));
          currentLine = chunks[chunks.length - 1] ?? "";
        }
      }
      continue;
    }

    const candidate = `${currentLine} ${word}`;
    if (ctx.measureText(candidate).width <= safeMaxWidth) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    if (ctx.measureText(word).width <= safeMaxWidth) {
      currentLine = word;
    } else {
      const chunks = breakWordToFit(ctx, word, safeMaxWidth);
      lines.push(...chunks.slice(0, -1));
      currentLine = chunks[chunks.length - 1] ?? "";
    }
  }

  if (currentLine.length > 0) lines.push(currentLine);
  return lines.length > 0 ? lines : ["-"];
}

function drawCenteredLines(params: {
  ctx: CanvasRenderingContext2D;
  lines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  lineHeight: number;
  fill: string;
  font: string;
}): void {
  const { ctx, lines, x, y, width, height, lineHeight, fill, font } = params;
  if (lines.length === 0) return;

  ctx.fillStyle = fill;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const blockHeight = lines.length * lineHeight;
  const startY = y + (height - blockHeight) / 2 + lineHeight / 2;
  const textX = x + width / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, textX, startY + index * lineHeight);
  });
}

export function createSnapshotCanvas(params: {
  rows: GridRow[];
  attributes: PuzzleAttribute[];
  summaryLine: string;
  theme: "light" | "dark";
}): HTMLCanvasElement | null {
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return null;

  measureCtx.font = BODY_FONT;
  const guessCandidateWidths = params.rows.map((row) => measureCtx.measureText(normalizeCellText(row.guess.name)).width);
  measureCtx.font = HEADER_FONT;
  const guessHeaderWidth = measureCtx.measureText("Guess").width;
  const guessWidth = clamp(
    Math.ceil(Math.max(guessHeaderWidth, ...guessCandidateWidths, 0) + CELL_PADDING_X * 2),
    190,
    320
  );

  const attributeWidths = params.attributes.map((attribute) => {
    measureCtx.font = BODY_FONT;
    const valueWidths = params.rows.map((row) => measureCtx.measureText(normalizeCellText(row.values?.[attribute.key] ?? "-")).width);
    measureCtx.font = HEADER_FONT;
    const labelWidth = measureCtx.measureText(attribute.label).width;
    return clamp(Math.ceil(Math.max(labelWidth, ...valueWidths, 0) + CELL_PADDING_X * 2), 150, 280);
  });

  measureCtx.font = HEADER_FONT;
  const headerGuessLines = wrapText(measureCtx, "Guess", guessWidth - CELL_PADDING_X * 2);
  const headerLinesByAttribute = params.attributes.map((attribute, index) =>
    wrapText(measureCtx, attribute.label, attributeWidths[index] - CELL_PADDING_X * 2)
  );
  const maxHeaderLines = Math.max(headerGuessLines.length, ...headerLinesByAttribute.map((lines) => lines.length));
  const headerHeight = Math.max(MIN_HEADER_HEIGHT, maxHeaderLines * HEADER_LINE_HEIGHT + CELL_PADDING_Y * 2);

  measureCtx.font = BODY_FONT;
  const preparedRows: PreparedRow[] = params.rows.map((row) => {
    const guessLines = wrapText(measureCtx, row.guess.name, guessWidth - CELL_PADDING_X * 2);
    const valueLinesByAttribute = params.attributes.map((attribute, index) =>
      wrapText(measureCtx, row.values?.[attribute.key] ?? "-", attributeWidths[index] - CELL_PADDING_X * 2)
    );
    const maxLines = Math.max(guessLines.length, ...valueLinesByAttribute.map((lines) => lines.length));
    const rowHeight = Math.max(MIN_ROW_HEIGHT, maxLines * BODY_LINE_HEIGHT + CELL_PADDING_Y * 2);
    return { guessLines, valueLinesByAttribute, rowHeight };
  });

  const tableWidth = guessWidth + attributeWidths.reduce((total, width) => total + width, 0);
  const rowsHeight = preparedRows.reduce((total, row) => total + row.rowHeight, 0);
  const tableHeight = headerHeight + rowsHeight;
  const logicalWidth = PADDING * 2 + tableWidth;
  const logicalHeight = PADDING * 2 + TITLE_BLOCK_HEIGHT + tableHeight;

  const deviceScale = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const renderScale = Math.max(2, Math.min(4, Math.ceil(deviceScale)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(logicalWidth * renderScale);
  canvas.height = Math.ceil(logicalHeight * renderScale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(renderScale, renderScale);
  ctx.imageSmoothingEnabled = true;

  const background = params.theme === "dark" ? "#151825" : "#f2f4f8";
  const textColor = params.theme === "dark" ? "#ecf2ff" : "#122036";
  const border = params.theme === "dark" ? "#2f4c82" : "#b2bfd6";
  const headerBg = params.theme === "dark" ? "#18294b" : "#e2e9f5";
  const guessBg = params.theme === "dark" ? "#223b67" : "#cfdcf2";

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  ctx.fillStyle = textColor;
  ctx.font = TITLE_FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("DevGuess", PADDING, PADDING + 30);
  ctx.font = SUMMARY_FONT;
  ctx.fillText(params.summaryLine, PADDING, PADDING + 64);

  const tableX = PADDING;
  let currentY = PADDING + TITLE_BLOCK_HEIGHT;

  ctx.fillStyle = headerBg;
  ctx.fillRect(tableX, currentY, tableWidth, headerHeight);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;

  let currentX = tableX;
  ctx.strokeRect(currentX, currentY, guessWidth, headerHeight);
  drawCenteredLines({
    ctx,
    lines: headerGuessLines,
    x: currentX,
    y: currentY,
    width: guessWidth,
    height: headerHeight,
    lineHeight: HEADER_LINE_HEIGHT,
    fill: textColor,
    font: HEADER_FONT
  });
  currentX += guessWidth;

  params.attributes.forEach((_, index) => {
    const cellWidth = attributeWidths[index];
    ctx.strokeRect(currentX, currentY, cellWidth, headerHeight);
    drawCenteredLines({
      ctx,
      lines: headerLinesByAttribute[index],
      x: currentX,
      y: currentY,
      width: cellWidth,
      height: headerHeight,
      lineHeight: HEADER_LINE_HEIGHT,
      fill: textColor,
      font: HEADER_FONT
    });
    currentX += cellWidth;
  });

  currentY += headerHeight;

  preparedRows.forEach((preparedRow, rowIndex) => {
    const row = params.rows[rowIndex];
    const { rowHeight } = preparedRow;
    let rowX = tableX;

    ctx.fillStyle = guessBg;
    ctx.fillRect(rowX, currentY, guessWidth, rowHeight);
    ctx.strokeStyle = border;
    ctx.strokeRect(rowX, currentY, guessWidth, rowHeight);
    drawCenteredLines({
      ctx,
      lines: preparedRow.guessLines,
      x: rowX,
      y: currentY,
      width: guessWidth,
      height: rowHeight,
      lineHeight: BODY_LINE_HEIGHT,
      fill: textColor,
      font: BODY_FONT
    });
    rowX += guessWidth;

    params.attributes.forEach((attribute, attributeIndex) => {
      const width = attributeWidths[attributeIndex];
      const cell = row.cells[attribute.key];
      const fillColor = cell ? getCellColor(cell.status) : "#7c8797";

      ctx.fillStyle = fillColor;
      ctx.fillRect(rowX, currentY, width, rowHeight);
      ctx.strokeStyle = border;
      ctx.strokeRect(rowX, currentY, width, rowHeight);
      drawCenteredLines({
        ctx,
        lines: preparedRow.valueLinesByAttribute[attributeIndex],
        x: rowX,
        y: currentY,
        width,
        height: rowHeight,
        lineHeight: BODY_LINE_HEIGHT,
        fill: "#ffffff",
        font: BODY_FONT
      });
      rowX += width;
    });

    currentY += rowHeight;
  });

  return canvas;
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function createPdfBlobFromJpeg(params: {
  jpegBytes: Uint8Array;
  imageWidth: number;
  imageHeight: number;
}): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets = [0, 0, 0, 0, 0, 0];
  let offset = 0;

  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const scale = Math.min(maxWidth / params.imageWidth, maxHeight / params.imageHeight);
  const drawWidth = params.imageWidth * scale;
  const drawHeight = params.imageHeight * scale;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;

  const contentStream = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);

  const pushBytes = (chunk: Uint8Array): void => {
    parts.push(chunk);
    offset += chunk.length;
  };

  const pushText = (text: string): void => {
    pushBytes(encoder.encode(text));
  };

  pushBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  offsets[1] = offset;
  pushText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets[2] = offset;
  pushText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  offsets[3] = offset;
  pushText(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  offsets[4] = offset;
  pushText(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${params.imageWidth} /Height ${params.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${params.jpegBytes.length} >>\nstream\n`
  );
  pushBytes(params.jpegBytes);
  pushText("\nendstream\nendobj\n");

  offsets[5] = offset;
  pushText(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushText("endstream\nendobj\n");

  const xrefOffset = offset;
  pushText("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i += 1) {
    pushText(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(parts, { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 200);
}

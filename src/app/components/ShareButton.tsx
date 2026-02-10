import { useMemo, useState } from "react";
import type { GridRow, PuzzleAttribute } from "../lib/types";

type Props = {
  disabled: boolean;
  rows: GridRow[];
  attributes: PuzzleAttribute[];
  roundId: string;
  theme: "light" | "dark";
};

function getCellColor(status: "green" | "yellow" | "gray"): string {
  if (status === "green") return "#188359";
  if (status === "yellow") return "#c48510";
  return "#5b677d";
}

function trimValue(value: string, maxLen = 18): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}...`;
}

function formatRoundLabel(roundId: string): string {
  const shortId = roundId.slice(0, 8).toUpperCase();
  return `Round ${shortId}`;
}

function formatRoundFilePart(roundId: string): string {
  const shortId = roundId.slice(0, 8).toLowerCase();
  return shortId || "round";
}

function createSnapshotCanvas(params: {
  rows: GridRow[];
  attributes: PuzzleAttribute[];
  roundId: string;
  theme: "light" | "dark";
}): HTMLCanvasElement | null {
  const guessWidth = 170;
  const cellWidth = 138;
  const cellHeight = 52;
  const headerHeight = 52;
  const padding = 24;
  const titleHeight = 54;
  const tableWidth = guessWidth + params.attributes.length * cellWidth;
  const width = padding * 2 + tableWidth;
  const height = padding * 2 + titleHeight + headerHeight + params.rows.length * cellHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const background = params.theme === "dark" ? "#151825" : "#f2f4f8";
  const textColor = params.theme === "dark" ? "#ecf2ff" : "#122036";
  const border = params.theme === "dark" ? "#2f4c82" : "#b2bfd6";
  const headerBg = params.theme === "dark" ? "#18294b" : "#e2e9f5";
  const guessBg = params.theme === "dark" ? "#223b67" : "#cfdcf2";

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = textColor;
  ctx.font = "700 30px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`DevGuess ${formatRoundLabel(params.roundId)}`, padding, padding + 30);

  const tableX = padding;
  const tableY = padding + titleHeight;

  ctx.fillStyle = headerBg;
  ctx.fillRect(tableX, tableY, tableWidth, headerHeight);

  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(tableX, tableY, tableWidth, headerHeight);

  ctx.fillStyle = textColor;
  ctx.font = "700 14px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Guess", tableX + guessWidth / 2, tableY + headerHeight / 2);

  params.attributes.forEach((attribute, index) => {
    const x = tableX + guessWidth + index * cellWidth;
    ctx.strokeRect(x, tableY, cellWidth, headerHeight);
    ctx.fillText(attribute.label, x + cellWidth / 2, tableY + headerHeight / 2);
  });

  params.rows.forEach((row, rowIndex) => {
    const y = tableY + headerHeight + rowIndex * cellHeight;

    ctx.fillStyle = guessBg;
    ctx.fillRect(tableX, y, guessWidth, cellHeight);
    ctx.strokeStyle = border;
    ctx.strokeRect(tableX, y, guessWidth, cellHeight);
    ctx.fillStyle = textColor;
    ctx.fillText(trimValue(row.guess.name, 20), tableX + guessWidth / 2, y + cellHeight / 2);

    params.attributes.forEach((attribute, colIndex) => {
      const cell = row.cells[attribute.key];
      const value = trimValue(row.values?.[attribute.key] ?? "", 17);
      const x = tableX + guessWidth + colIndex * cellWidth;

      if (cell) {
        ctx.fillStyle = getCellColor(cell.status);
      } else {
        ctx.fillStyle = "#7c8797";
      }

      ctx.fillRect(x, y, cellWidth, cellHeight);
      ctx.strokeStyle = border;
      ctx.strokeRect(x, y, cellWidth, cellHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(value || "-", x + cellWidth / 2, y + cellHeight / 2);
    });
  });

  return canvas;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function createPdfBlobFromJpeg(params: {
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

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 200);
}

export function ShareButton({ disabled, rows, attributes, roundId, theme }: Props) {
  const [open, setOpen] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const snapshotCanvas = useMemo(() => {
    if (!open || rows.length === 0) return null;
    return createSnapshotCanvas({ rows, attributes, roundId, theme });
  }, [open, rows, attributes, roundId, theme]);

  const previewUrl = useMemo(() => {
    if (!snapshotCanvas) return "";
    return snapshotCanvas.toDataURL("image/png");
  }, [snapshotCanvas]);

  function onDownloadPng(): void {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `devguess-${formatRoundFilePart(roundId)}.png`;
    link.click();
  }

  function onDownloadPdf(): void {
    if (!snapshotCanvas) return;

    try {
      setPdfError(null);
      const jpegUrl = snapshotCanvas.toDataURL("image/jpeg", 0.92);
      const jpegBytes = dataUrlToBytes(jpegUrl);
      const blob = createPdfBlobFromJpeg({
        jpegBytes,
        imageWidth: snapshotCanvas.width,
        imageHeight: snapshotCanvas.height
      });
      downloadBlob(blob, `devguess-${formatRoundFilePart(roundId)}.pdf`);
    } catch {
      setPdfError("Unable to generate PDF for this snapshot.");
    }
  }

  return (
    <>
      <button type="button" className="share-btn" disabled={disabled} onClick={() => setOpen(true)}>
        Share
      </button>

      {open ? (
        <div className="share-modal-backdrop" role="dialog" aria-modal="true" aria-label="Share snapshot preview">
          <div className="share-modal">
            <div className="share-modal-header">
              <h3>Snapshot Preview</h3>
              <div className="share-modal-actions">
                <button type="button" className="ghost-btn" onClick={onDownloadPdf} disabled={!snapshotCanvas}>
                  Download PDF
                </button>
                <button type="button" className="ghost-btn" onClick={onDownloadPng} disabled={!previewUrl}>
                  Download PNG
                </button>
                <button type="button" className="ghost-btn" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            </div>
            <div className="share-preview-wrap">
              {previewUrl ? <img src={previewUrl} alt="Guess history snapshot preview" /> : <p className="hint">No guesses yet.</p>}
            </div>
            {pdfError ? <p className="error-text share-error">{pdfError}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

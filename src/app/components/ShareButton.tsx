import { useMemo, useState } from "react";
import type { GridRow, PuzzleAttribute } from "../lib/types";
import { createPdfBlobFromJpeg, createSnapshotCanvas, dataUrlToBytes, downloadBlob, getSnapshotSummary } from "../lib/snapshot";

type Props = {
  disabled: boolean;
  rows: GridRow[];
  attributes: PuzzleAttribute[];
  isSolved: boolean;
  isOver: boolean;
  timerStartedAtMs: number | null;
  timerEndedAtMs: number | null;
  theme: "light" | "dark";
};

export function ShareButton({
  disabled,
  rows,
  attributes,
  isSolved,
  isOver,
  timerStartedAtMs,
  timerEndedAtMs,
  theme
}: Props) {
  const [open, setOpen] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const snapshotSummary = getSnapshotSummary({
    isSolved,
    isOver,
    timerStartedAtMs,
    timerEndedAtMs,
    nowMs: Date.now()
  });

  const snapshotCanvas = useMemo(() => {
    if (!open || rows.length === 0) return null;
    return createSnapshotCanvas({ rows, attributes, summaryLine: snapshotSummary.line, theme });
  }, [open, rows, attributes, snapshotSummary.line, theme]);

  const previewUrl = useMemo(() => {
    if (!snapshotCanvas) return "";
    return snapshotCanvas.toDataURL("image/png");
  }, [snapshotCanvas]);

  function onDownloadPng(): void {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `devguess-${snapshotSummary.filePart}.png`;
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
      downloadBlob(blob, `devguess-${snapshotSummary.filePart}.pdf`);
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

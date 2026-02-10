import { useMemo, useState, type CSSProperties } from "react";
import { createPdfBlobFromJpeg, createSnapshotCanvas, dataUrlToBytes, downloadBlob, getSnapshotSummary } from "../lib/snapshot";
import type { GridRow, PuzzleAttribute } from "../lib/types";

type Props = {
  open: boolean;
  roundId: string;
  rows: GridRow[];
  attributes: PuzzleAttribute[];
  isSolved: boolean;
  isOver: boolean;
  timerStartedAtMs: number | null;
  timerEndedAtMs: number | null;
  theme: "light" | "dark";
  onGenerateKeyword: () => void;
  onClose: () => void;
};

type ConfettiPiece = {
  id: string;
  leftPercent: number;
  delayMs: number;
  durationMs: number;
  driftPx: number;
  sizePx: number;
  rotationTurns: number;
  color: string;
};

const CELEBRATION_JOKES = [
  "You debugged reality faster than your linter could complain.",
  "That guess was so sharp it refactored the timeline.",
  "Somewhere a rubber duck just gave you a standing ovation.",
  "You solved it with fewer stack traces than expected. Historic moment.",
  "Your brain just shipped to production with zero rollback.",
  "If confidence had CI, this run would be all green checks.",
  "Even the compiler whispered: \"okay, that was clean.\"",
  "You guessed so well the bug report apologized first.",
  "That was smoother than a hotfix at 2 AM.",
  "You turned uncertainty into a commit message."
];

const BOOST_LINES = [
  "Knowledge boost unlocked: Pattern Hunter +1",
  "Skill tree updated: Systems intuition +1",
  "Achievement earned: Calm under uncertainty",
  "XP gained: Curious thinker -> precise finisher",
  "Passive buff active: You ask better questions now",
  "You just proved your instincts are production-ready",
  "Confidence patch applied: Stable and fast",
  "Milestone reached: Analytical focus +1",
  "New trait discovered: Relentlessly resourceful",
  "Precision mode enabled: You see structure in chaos"
];

const CONFETTI_COLORS = ["#ffd166", "#06d6a0", "#4cc9f0", "#f72585", "#f9844a", "#90be6d", "#9b5de5", "#43aa8b"];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number): number {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return raw - Math.floor(raw);
}

function pickBySeed<T>(items: T[], seed: number): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty list.");
  }
  const index = Math.abs(seed) % items.length;
  return items[index];
}

function buildConfetti(seed: number): ConfettiPiece[] {
  return Array.from({ length: 110 }, (_, index) => {
    const localSeed = seed + (index + 1) * 97;
    const sizePx = 7 + Math.round(seededUnit(localSeed + 2) * 9);

    return {
      id: `confetti:${index}`,
      leftPercent: seededUnit(localSeed) * 100,
      delayMs: Math.round(seededUnit(localSeed + 1) * 320),
      durationMs: 2100 + Math.round(seededUnit(localSeed + 3) * 1700),
      driftPx: -120 + Math.round(seededUnit(localSeed + 4) * 240),
      sizePx,
      rotationTurns: 2 + seededUnit(localSeed + 5) * 3,
      color: CONFETTI_COLORS[Math.floor(seededUnit(localSeed + 6) * CONFETTI_COLORS.length) % CONFETTI_COLORS.length]
    };
  });
}

export function VictoryModal({
  open,
  roundId,
  rows,
  attributes,
  isSolved,
  isOver,
  timerStartedAtMs,
  timerEndedAtMs,
  theme,
  onGenerateKeyword,
  onClose
}: Props) {
  const [pdfError, setPdfError] = useState<string | null>(null);

  const summary = getSnapshotSummary({
    isSolved,
    isOver,
    timerStartedAtMs,
    timerEndedAtMs,
    nowMs: Date.now()
  });

  const celebrationSeed = useMemo(
    () => hashString(`${roundId}:${rows.length}:${timerStartedAtMs ?? 0}:${timerEndedAtMs ?? 0}`),
    [roundId, rows.length, timerStartedAtMs, timerEndedAtMs]
  );
  const celebrationJoke = useMemo(() => pickBySeed(CELEBRATION_JOKES, celebrationSeed + 17), [celebrationSeed]);
  const boostLine = useMemo(() => pickBySeed(BOOST_LINES, celebrationSeed + 43), [celebrationSeed]);
  const confettiPieces = useMemo(() => buildConfetti(celebrationSeed), [celebrationSeed]);

  const snapshotCanvas = useMemo(() => {
    if (!open || rows.length === 0) return null;
    return createSnapshotCanvas({
      rows,
      attributes,
      summaryLine: summary.line,
      theme
    });
  }, [open, rows, attributes, summary.line, theme]);

  const previewUrl = useMemo(() => {
    if (!snapshotCanvas) return "";
    return snapshotCanvas.toDataURL("image/png");
  }, [snapshotCanvas]);

  if (!open) return null;

  function onDownloadPng(): void {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `devguess-${summary.filePart}.png`;
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
      downloadBlob(blob, `devguess-${summary.filePart}.pdf`);
    } catch {
      setPdfError("Unable to generate PDF for this snapshot.");
    }
  }

  return (
    <>
      <div className="celebration-confetti" aria-hidden="true">
        {confettiPieces.map((piece) => {
          const style = {
            "--confetti-left": `${piece.leftPercent}%`,
            "--confetti-delay-ms": `${piece.delayMs}ms`,
            "--confetti-duration-ms": `${piece.durationMs}ms`,
            "--confetti-drift": `${piece.driftPx}px`,
            "--confetti-size": `${piece.sizePx}px`,
            "--confetti-rotation": `${piece.rotationTurns}turn`,
            backgroundColor: piece.color
          } as CSSProperties;

          return <span key={piece.id} className="celebration-confetti-piece" style={style} />;
        })}
      </div>
      <div className="victory-modal-backdrop" role="dialog" aria-modal="true" aria-label="Victory celebration">
        <div className="victory-modal">
          <div className="victory-modal-header">
            <h3>Congratulations, you did it!</h3>
          </div>
          <div className="victory-modal-copy">
            <p className="victory-modal-summary">{summary.line}</p>
            <p className="victory-modal-joke">{celebrationJoke}</p>
            <p className="victory-modal-boost">{boostLine}</p>
          </div>
          <div className="share-preview-wrap victory-preview-wrap">
            {previewUrl ? (
              <img src={previewUrl} alt="Celebration snapshot preview" />
            ) : (
              <p className="hint">No snapshot available yet.</p>
            )}
          </div>
          <div className="victory-modal-actions">
            <button
              type="button"
              className="ghost-btn victory-primary-action"
              onClick={() => {
                onClose();
                onGenerateKeyword();
              }}
            >
              New Keyword
            </button>
            <button type="button" className="ghost-btn" onClick={onDownloadPdf} disabled={!snapshotCanvas}>
              Download PDF
            </button>
            <button type="button" className="ghost-btn" onClick={onDownloadPng} disabled={!previewUrl}>
              Download PNG
            </button>
            <button type="button" className="ghost-btn" onClick={onClose}>
              Close
            </button>
          </div>
          {pdfError ? <p className="error-text share-error">{pdfError}</p> : null}
        </div>
      </div>
    </>
  );
}

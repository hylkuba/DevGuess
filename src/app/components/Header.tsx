import { useMemo, useState } from "react";
import { getDailyTip } from "../lib/attributeGuide";

type Props = {
  puzzleId: string;
  puzzleNo: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenReference: () => void;
};

function formatPuzzleDate(puzzleId: string): string {
  const date = new Date(`${puzzleId}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Daily Puzzle";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function ThemeSunIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.2v2.1M10 15.7v2.1M2.2 10h2.1M15.7 10h2.1M4.5 4.5l1.5 1.5M14 14l1.5 1.5M15.5 4.5L14 6M6 14l-1.5 1.5" />
    </svg>
  );
}

function ThemeMoonIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M12.8 2.8a7 7 0 1 0 4.4 12.7A7.2 7.2 0 0 1 12.8 2.8z" />
    </svg>
  );
}

export function Header({ puzzleId, puzzleNo, theme, onToggleTheme, onOpenReference }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const dailyTip = useMemo(() => getDailyTip(puzzleNo), [puzzleNo]);

  return (
    <header className="page-header">
      <div className="header-top">
        <div>
          <h1>DevGuess</h1>
          <p>{formatPuzzleDate(puzzleId)}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost-btn" onClick={() => setShowTip((value) => !value)} aria-expanded={showTip}>
            Daily Tip
          </button>
          <button type="button" className="ghost-btn" onClick={() => setShowGuide((value) => !value)} aria-expanded={showGuide}>
            Guide
          </button>
          <button type="button" className="ghost-btn" onClick={onOpenReference}>
            Reference DB
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Light theme" : "Dark theme"}
          >
            <span className={theme === "dark" ? "theme-sun" : "theme-moon"}>
              {theme === "dark" ? <ThemeSunIcon /> : <ThemeMoonIcon />}
            </span>
          </button>
        </div>
      </div>

      {showTip ? (
        <section className="tip-panel" aria-label="Daily tip">
          <h2>Daily Tip</h2>
          <p>{dailyTip}</p>
        </section>
      ) : null}

      {showGuide ? (
        <section className="help-panel" aria-label="How DevGuess works">
          <h2>How DevGuess Works</h2>
          <ol>
            <li>Find today&apos;s hidden technology.</li>
            <li>Each cell shows your guessed value for that category.</li>
            <li>Cell colors indicate match strength between your guess and the hidden answer.</li>
            <li>Year hints only show direction with an arrow.</li>
            <li>Use Reference DB for the full category taxonomy and all implemented items with filters.</li>
          </ol>
        </section>
      ) : null}
    </header>
  );
}

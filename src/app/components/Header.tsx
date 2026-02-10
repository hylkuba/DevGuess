import { useEffect, useMemo, useState } from "react";

type Props = {
  timerStartedAtMs: number | null;
  timerEndedAtMs: number | null;
  pending: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenReference: () => void;
  onGenerateKeyword: () => void;
};

function formatLocalTime(timestampMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(timestampMs);
}

function formatTimer(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hoursPart = hours > 0 ? `${String(hours).padStart(2, "0")}:` : "";
  return `${hoursPart}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

export function Header({
  timerStartedAtMs,
  timerEndedAtMs,
  pending,
  theme,
  onToggleTheme,
  onOpenReference,
  onGenerateKeyword
}: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const localTimeLabel = useMemo(() => formatLocalTime(nowMs), [nowMs]);
  const timerElapsedMs = useMemo(() => {
    if (timerStartedAtMs == null) return 0;
    const endMs = timerEndedAtMs ?? nowMs;
    return Math.max(0, endMs - timerStartedAtMs);
  }, [nowMs, timerEndedAtMs, timerStartedAtMs]);
  const timerLabel = useMemo(() => formatTimer(timerElapsedMs), [timerElapsedMs]);

  return (
    <header className="page-header">
      <div className="header-top">
        <div>
          <h1>DevGuess</h1>
          <p className="header-status-line">
            Local time: {localTimeLabel} | Timer: {timerLabel}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost-btn" onClick={onGenerateKeyword} disabled={pending}>
            Generate New Keyword
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
            <span className={theme === "dark" ? "theme-sun" : "theme-moon"}>{theme === "dark" ? <ThemeSunIcon /> : <ThemeMoonIcon />}</span>
          </button>
        </div>
      </div>

      {showGuide ? (
        <section className="help-panel" aria-label="How DevGuess works">
          <h2>How DevGuess Works</h2>
          <ol>
            <li>Find the current hidden technology keyword.</li>
            <li>Start guessing to reveal matches and narrow down the answer.</li>
            <li>Each cell shows your guessed value for that category.</li>
            <li>Green means an exact match for that column.</li>
            <li>
              Yellow for <code className="welcome-code">Kind</code>, <code className="welcome-code">Ecosystem</code>, and{" "}
              <code className="welcome-code">License</code> means same parent family (not exact leaf).
            </li>
            <li>
              <code className="welcome-code">Domains</code> use exact-set matching: green for exact set, otherwise gray.
            </li>
            <li>
              Yellow for <code className="welcome-code">Use</code>, <code className="welcome-code">Platform</code>, and{" "}
              <code className="welcome-code">Runtime</code> means at least one shared value (overlap), not subgroup matching.
            </li>
            <li>
              Yellow for <code className="welcome-code">Year</code> means your guess is within 5 years; arrow shows newer (up) or
              older (down).
            </li>
            <li>Gray means no meaningful match for that column.</li>
            <li>Hover green and yellow cells for extra context and tips.</li>
            <li>
              Use the <code className="welcome-code">Hint</code> button near <code className="welcome-code">Guess</code> for a clue,
              and <code className="welcome-code">Reference DB</code> for full taxonomy.
            </li>
          </ol>
        </section>
      ) : null}
    </header>
  );
}

import { useState } from "react";

type Props = {
  roundId: string;
  keywordPoolSize: number;
  pending: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenReference: () => void;
  onGenerateKeyword: () => void;
};

function formatRoundLabel(roundId: string): string {
  const shortId = roundId.slice(0, 8).toUpperCase();
  return `Round ${shortId}`;
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

export function Header({ roundId, keywordPoolSize, pending, theme, onToggleTheme, onOpenReference, onGenerateKeyword }: Props) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <header className="page-header">
      <div className="header-top">
        <div>
          <h1>DevGuess</h1>
          <p>
            {formatRoundLabel(roundId)} | {keywordPoolSize} registered keywords
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

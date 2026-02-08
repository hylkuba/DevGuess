import { Grid } from "../components/Grid";
import { GuessInput } from "../components/GuessInput";
import { Header } from "../components/Header";
import { ShareButton } from "../components/ShareButton";
import type { GridRow, MetaResponse, SearchResult } from "../lib/types";

type Props = {
  meta: MetaResponse;
  rows: GridRow[];
  pending: boolean;
  isOver: boolean;
  isSolved: boolean;
  showLimitNotice: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenReference: () => void;
  onGuess: (guess: SearchResult) => void;
  onReset: () => void;
  onDismissLimitNotice: () => void;
};

const GITHUB_REPO_URL = "https://github.com/hylkuba/DevGuess";

export function Home({
  meta,
  rows,
  pending,
  isOver,
  isSolved,
  showLimitNotice,
  theme,
  onToggleTheme,
  onOpenReference,
  onGuess,
  onReset,
  onDismissLimitNotice
}: Props) {
  const guessedIds = new Set(rows.map((row) => row.guess.id));

  return (
    <main className="page-shell">
      <Header
        puzzleId={meta.puzzleId}
        puzzleNo={meta.puzzleNo}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenReference={onOpenReference}
      />
      <GuessInput disabled={pending || isOver} guessedIds={guessedIds} onSubmit={onGuess} />
      <Grid attributes={meta.attributes} rows={rows} pending={pending} />

      <footer className="site-footer">
        <div className="footer-row">
          <p>{isOver ? (isSolved ? "Solved." : "Round over.") : "Keep guessing."}</p>
          <div className="footer-actions">
            <button type="button" className="ghost-btn" onClick={onReset} disabled={pending}>
              Reset
            </button>
            <ShareButton disabled={rows.length === 0} rows={rows} attributes={meta.attributes} puzzleNo={meta.puzzleNo} theme={theme} />
          </div>
        </div>
        <p className="footer-credit">
          Open source project by hylkuba.{" "}
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" aria-label="Open GitHub repository">
            GitHub
          </a>
        </p>
      </footer>

      {showLimitNotice ? (
        <div className="limit-modal-backdrop" role="dialog" aria-modal="true" aria-label="Guess limit reached">
          <div className="limit-modal">
            <h3>You&apos;ve reached your limit.</h3>
            <p>Start a fresh round to try again.</p>
            <div className="limit-modal-actions">
              <button type="button" className="ghost-btn" onClick={onReset}>
                Reset
              </button>
              <button type="button" className="ghost-btn" onClick={onDismissLimitNotice}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

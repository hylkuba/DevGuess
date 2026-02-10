import { Grid } from "../components/Grid";
import { GuessInput } from "../components/GuessInput";
import { Header } from "../components/Header";
import { ShareButton } from "../components/ShareButton";
import type { GridRow, MetaResponse, SearchResult } from "../lib/types";

type Props = {
  meta: MetaResponse;
  roundId: string;
  keywordHint: string;
  rows: GridRow[];
  pending: boolean;
  isOver: boolean;
  isSolved: boolean;
  showLimitNotice: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenReference: () => void;
  onGuess: (guess: SearchResult) => void;
  onGenerateKeyword: () => void;
  onDismissLimitNotice: () => void;
};

const GITHUB_REPO_URL = "https://github.com/hylkuba/DevGuess";
const GITHUB_ISSUE_URL = "https://github.com/hylkuba/DevGuess/issues/new";

export function Home({
  meta,
  roundId,
  keywordHint,
  rows,
  pending,
  isOver,
  isSolved,
  showLimitNotice,
  theme,
  onToggleTheme,
  onOpenReference,
  onGuess,
  onGenerateKeyword,
  onDismissLimitNotice
}: Props) {
  const guessedIds = new Set(rows.map((row) => row.guess.id));

  return (
    <main className="page-shell">
      <Header
        roundId={roundId}
        keywordPoolSize={meta.keywordPoolSize}
        pending={pending}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onOpenReference={onOpenReference}
        onGenerateKeyword={onGenerateKeyword}
      />
      <GuessInput
        disabled={pending || isOver}
        guessedIds={guessedIds}
        hintText={keywordHint}
        hintKey={roundId}
        onSubmit={onGuess}
      />
      <Grid attributes={meta.attributes} rows={rows} pending={pending} />

      <footer className="site-footer">
        <div className="footer-row">
          <p>Keep guessing...</p>
          <div className="footer-actions">
            <button
              type="button"
              className="share-btn"
              aria-label="Report an issue on GitHub"
              onClick={() => {
                window.open(GITHUB_ISSUE_URL, "_blank", "noopener,noreferrer");
              }}
            >
              Report Issue
            </button>
            <ShareButton disabled={false} rows={rows} attributes={meta.attributes} roundId={roundId} theme={theme} />
          </div>
        </div>
        <p className="footer-credit">
          This project has been made open source by @hylkuba. Feel free to contribute to the project, I&apos;ll appreciate your
          help.{" "}
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" aria-label="Open GitHub repository">
            GitHub Repository
          </a>
        </p>
      </footer>

      {showLimitNotice ? (
        <div className="limit-modal-backdrop" role="dialog" aria-modal="true" aria-label="Guess limit reached">
          <div className="limit-modal">
            <h3>You&apos;ve reached your limit.</h3>
            <p>Start a fresh round to try again.</p>
            <div className="limit-modal-actions">
              <button type="button" className="ghost-btn" onClick={onGenerateKeyword}>
                New Keyword
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

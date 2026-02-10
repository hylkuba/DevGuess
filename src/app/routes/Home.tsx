import { Grid } from "../components/Grid";
import { GuessInput } from "../components/GuessInput";
import { Header } from "../components/Header";
import { ShareButton } from "../components/ShareButton";
import { VictoryModal } from "../components/VictoryModal";
import type { GridRow, MetaResponse, SearchResult } from "../lib/types";

type Props = {
  meta: MetaResponse;
  roundId: string;
  keywordHint: string;
  rows: GridRow[];
  timerStartedAtMs: number | null;
  timerEndedAtMs: number | null;
  pending: boolean;
  isOver: boolean;
  isSolved: boolean;
  showLimitNotice: boolean;
  showWinNotice: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenReference: () => void;
  onGuess: (guess: SearchResult) => void;
  onGenerateKeyword: () => void;
  onDismissLimitNotice: () => void;
  onDismissWinNotice: () => void;
};

const GITHUB_REPO_URL = "https://github.com/hylkuba/DevGuess";
const GITHUB_ISSUE_URL = "https://github.com/hylkuba/DevGuess/issues/new";

export function Home({
  meta,
  roundId,
  keywordHint,
  rows,
  timerStartedAtMs,
  timerEndedAtMs,
  pending,
  isOver,
  isSolved,
  showLimitNotice,
  showWinNotice,
  theme,
  onToggleTheme,
  onOpenReference,
  onGuess,
  onGenerateKeyword,
  onDismissLimitNotice,
  onDismissWinNotice
}: Props) {
  const guessedIds = new Set(rows.map((row) => row.guess.id));
  const showWelcomeBlock = rows.length === 0 && !pending;
  const celebratingRowKey = isSolved ? (rows.at(-1)?.guess.id ?? null) : null;

  return (
    <main className="page-shell">
      <Header
        pending={pending}
        timerStartedAtMs={timerStartedAtMs}
        timerEndedAtMs={timerEndedAtMs}
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
      <Grid attributes={meta.attributes} rows={rows} pending={pending} celebratingRowKey={celebratingRowKey} />
      {showWelcomeBlock ? (
        <section className="welcome-inline-slot" aria-label="Welcome to DevGuess">
          <div className="welcome-inline">
            <h2>Welcome to DevGuess</h2>
            <p>Find the hidden technology keyword. Start guessing to reveal matches and narrow down the answer.</p>
            <ul>
              <li>Green means exact match for that column.</li>
              <li>
                Yellow for <code className="welcome-code">Kind</code>, <code className="welcome-code">Ecosystem</code>, and{" "}
                <code className="welcome-code">License</code> means same parent group.
              </li>
              <li>
                Yellow for <code className="welcome-code">Use</code>, <code className="welcome-code">Platform</code>, and{" "}
                <code className="welcome-code">Runtime</code> means at least one overlap.
              </li>
              <li>
                Yellow for <code className="welcome-code">Year</code> means within 5 years, with arrow direction.
              </li>
              <li>Gray means no useful match.</li>
              <li>Hover green and yellow cells for extra context and tips.</li>
              <li>Use Guide for rules and Reference DB for the full taxonomy.</li>
            </ul>
          </div>
        </section>
      ) : null}

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
            <ShareButton
              disabled={false}
              rows={rows}
              attributes={meta.attributes}
              isSolved={isSolved}
              isOver={isOver}
              timerStartedAtMs={timerStartedAtMs}
              timerEndedAtMs={timerEndedAtMs}
              theme={theme}
            />
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

      <VictoryModal
        open={showWinNotice && isSolved}
        roundId={roundId}
        rows={rows}
        attributes={meta.attributes}
        isSolved={isSolved}
        isOver={isOver}
        timerStartedAtMs={timerStartedAtMs}
        timerEndedAtMs={timerEndedAtMs}
        theme={theme}
        onGenerateKeyword={onGenerateKeyword}
        onClose={onDismissWinNotice}
      />
    </main>
  );
}

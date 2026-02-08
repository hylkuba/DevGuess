import { Grid } from "../components/Grid";
import { GuessInput } from "../components/GuessInput";
import { Header } from "../components/Header";
import { ShareButton } from "../components/ShareButton";
import { buildShareText } from "../lib/shareFormat";
import type { GridRow, MetaResponse, SearchResult } from "../lib/types";

type Props = {
  meta: MetaResponse;
  rows: GridRow[];
  pending: boolean;
  isOver: boolean;
  isSolved: boolean;
  onGuess: (guess: SearchResult) => void;
};

export function Home({ meta, rows, pending, isOver, isSolved, onGuess }: Props) {
  const guessedIds = new Set(rows.map((row) => row.guess.id));
  const shareText = buildShareText({
    puzzleNo: meta.puzzleNo,
    rows,
    attributes: meta.attributes,
    maxGuesses: meta.maxGuesses,
    solved: isSolved,
    siteUrl: window.location.origin
  });

  return (
    <main className="page-shell">
      <Header puzzleNo={meta.puzzleNo} />
      <GuessInput disabled={pending || isOver} guessedIds={guessedIds} onSubmit={onGuess} />
      <Grid attributes={meta.attributes} rows={rows} pending={pending} />
      <div className="footer-row">
        <p>{isOver ? (isSolved ? "Solved." : "No guesses left.") : "Keep guessing."}</p>
        <ShareButton disabled={!isOver && !isSolved} text={shareText} />
      </div>
    </main>
  );
}


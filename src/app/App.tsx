import { useEffect, useMemo, useState } from "react";
import { fetchMeta, startPuzzle, submitGuess } from "./lib/apiClient";
import { clearStoredGame, loadStoredGame, saveStoredGame } from "./lib/storage";
import type { GridRow, MetaResponse, SearchResult, StoredGame } from "./lib/types";
import { Home } from "./routes/Home";

type RuntimeGame = {
  token: string;
  rows: GridRow[];
  state: {
    remaining: number;
    isSolved: boolean;
    isOver: boolean;
  };
  maxGuesses: number;
};

export function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [game, setGame] = useState<RuntimeGame | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setPending(true);
        setError(null);
        const metaResponse = await fetchMeta();
        if (!mounted) return;
        setMeta(metaResponse);

        const stored = loadStoredGame();
        if (stored && stored.puzzleId === metaResponse.puzzleId) {
          setGame({
            token: stored.token,
            rows: stored.rows,
            state: stored.state,
            maxGuesses: stored.maxGuesses
          });
          return;
        }

        clearStoredGame();
        const start = await startPuzzle(metaResponse.puzzleId);
        if (!mounted) return;

        const freshState: RuntimeGame = {
          token: start.token,
          rows: [],
          state: {
            remaining: start.maxGuesses,
            isSolved: false,
            isOver: false
          },
          maxGuesses: start.maxGuesses
        };

        setGame(freshState);
        persistGame(metaResponse.puzzleId, freshState);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        if (mounted) setPending(false);
      }
    };

    void initialize();
    return () => {
      mounted = false;
    };
  }, []);

  const busy = pending || !meta || !game;

  const body = useMemo(() => {
    if (!meta || !game) return null;
    return (
      <Home
        meta={meta}
        rows={game.rows}
        pending={pending}
        isOver={game.state.isOver}
        isSolved={game.state.isSolved}
        onGuess={(guess) => {
          void handleGuess(guess);
        }}
      />
    );
  }, [game, meta, pending]);

  async function handleGuess(guess: SearchResult): Promise<void> {
    if (!meta || !game || pending || game.state.isOver) return;
    if (game.rows.some((row) => row.guess.id === guess.id)) {
      setError("That guess has already been used.");
      return;
    }

    try {
      setPending(true);
      setError(null);
      const response = await submitGuess({
        puzzleId: meta.puzzleId,
        guessId: guess.id,
        token: game.token
      });

      const nextGame: RuntimeGame = {
        token: response.token,
        rows: [...game.rows, response.row],
        state: response.state,
        maxGuesses: game.maxGuesses
      };
      setGame(nextGame);
      persistGame(meta.puzzleId, nextGame);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function persistGame(puzzleId: string, currentGame: RuntimeGame): void {
    const record: StoredGame = {
      puzzleId,
      token: currentGame.token,
      rows: currentGame.rows,
      state: currentGame.state,
      maxGuesses: currentGame.maxGuesses
    };
    saveStoredGame(record);
  }

  return (
    <div className="app-root">
      {busy ? <p className="hint">Loading puzzle...</p> : body}
      {error ? <p className="error-banner">{error}</p> : null}
    </div>
  );
}


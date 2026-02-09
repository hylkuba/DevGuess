import { useEffect, useMemo, useState } from "react";
import { fetchMeta, startPuzzle, submitGuess } from "./lib/apiClient";
import { clearStoredGame, loadStoredGame, saveStoredGame } from "./lib/storage";
import type { GridRow, MetaResponse, SearchResult, StoredGame } from "./lib/types";
import { Home } from "./routes/Home";
import { ReferenceGuide } from "./routes/ReferenceGuide";

const THEME_STORAGE_KEY = "devguess.theme.v1";

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

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function createFreshRuntimeGame(token: string, maxGuesses: number): RuntimeGame {
  return {
    token,
    rows: [],
    state: {
      remaining: maxGuesses,
      isSolved: false,
      isOver: false
    },
    maxGuesses
  };
}

function shouldShowLimitNotice(game: RuntimeGame): boolean {
  return !game.state.isSolved && game.state.isOver && game.state.remaining === 0 && game.rows.length >= game.maxGuesses;
}

export function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [game, setGame] = useState<RuntimeGame | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [view, setView] = useState<"game" | "reference">("game");
  const [showLimitNotice, setShowLimitNotice] = useState(false);
  const [seenLimitToken, setSeenLimitToken] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
        const hasMissingValues = stored?.rows.some((row) => !row.values);
        const hasDifferentGuessCap = stored?.maxGuesses !== metaResponse.maxGuesses;

        if (stored && stored.puzzleId === metaResponse.puzzleId && !hasMissingValues && !hasDifferentGuessCap) {
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

        const freshState = createFreshRuntimeGame(start.token, start.maxGuesses);
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

  useEffect(() => {
    if (!game) return;
    if (shouldShowLimitNotice(game) && game.token !== seenLimitToken) {
      setShowLimitNotice(true);
      setSeenLimitToken(game.token);
    }
  }, [game, seenLimitToken]);

  const isInitializing = !meta || !game;

  const body = useMemo(() => {
    if (view === "reference") {
      return <ReferenceGuide onBack={() => setView("game")} />;
    }

    if (!meta || !game) return null;
    return (
      <Home
        meta={meta}
        rows={game.rows}
        pending={pending}
        isOver={game.state.isOver}
        isSolved={game.state.isSolved}
        showLimitNotice={showLimitNotice}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onOpenReference={() => setView("reference")}
        onGuess={(guess) => {
          void handleGuess(guess);
        }}
        onReset={() => {
          void handleReset();
        }}
        onDismissLimitNotice={() => setShowLimitNotice(false)}
      />
    );
  }, [game, meta, pending, showLimitNotice, theme, view]);

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

  async function handleReset(): Promise<void> {
    if (!meta || !game || pending) return;

    try {
      setPending(true);
      setError(null);
      const start = await startPuzzle(meta.puzzleId);
      const freshState = createFreshRuntimeGame(start.token, start.maxGuesses);
      setGame(freshState);
      persistGame(meta.puzzleId, freshState);
      setShowLimitNotice(false);
      setSeenLimitToken(null);
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
      {isInitializing && view === "game" ? <p className="hint">Loading puzzle...</p> : body}
      {error ? <p className="error-banner">{error}</p> : null}
    </div>
  );
}

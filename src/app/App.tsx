import { useEffect, useMemo, useState } from "react";
import { fetchMeta, startPuzzle, submitGuess } from "./lib/apiClient";
import { clearStoredGame, loadStoredGame, saveStoredGame } from "./lib/storage";
import type { GridRow, MetaResponse, SearchResult, StartResponse, StoredGame } from "./lib/types";
import { Home } from "./routes/Home";
import { ReferenceGuide } from "./routes/ReferenceGuide";

const THEME_STORAGE_KEY = "devguess.theme.v1";
const REVEAL_STEP_MS = 160;
const CELL_FLIP_DURATION_MS = 900;
const ROW_CELEBRATION_DURATION_MS = 820;
const ROW_CELEBRATION_DELAY_BUFFER_MS = 80;
const WIN_MODAL_DELAY_BUFFER_MS = 180;

type RuntimeGame = {
  roundId: string;
  hint: string;
  token: string;
  rows: GridRow[];
  timerStartedAtMs: number | null;
  timerEndedAtMs: number | null;
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

function createFreshRuntimeGame(start: StartResponse): RuntimeGame {
  return {
    roundId: start.roundId,
    hint: start.hint,
    token: start.token,
    rows: [],
    timerStartedAtMs: null,
    timerEndedAtMs: null,
    state: {
      remaining: start.maxGuesses,
      isSolved: false,
      isOver: false
    },
    maxGuesses: start.maxGuesses
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
  const [showWinNotice, setShowWinNotice] = useState(false);
  const [seenWinToken, setSeenWinToken] = useState<string | null>(null);

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
        const hasMissingRoundContext = !stored?.roundId || !stored?.hint || !stored?.token;

        if (stored && !hasMissingValues && !hasDifferentGuessCap && !hasMissingRoundContext) {
          const timerStartedAtMs =
            typeof stored.timerStartedAtMs === "number"
              ? stored.timerStartedAtMs
              : stored.rows.length > 0
                ? Date.now()
                : null;
          const timerEndedAtMs =
            typeof stored.timerEndedAtMs === "number"
              ? stored.timerEndedAtMs
              : stored.state.isOver && timerStartedAtMs != null
                ? Date.now()
                : null;

          setGame({
            roundId: stored.roundId,
            hint: stored.hint,
            token: stored.token,
            rows: stored.rows,
            timerStartedAtMs,
            timerEndedAtMs,
            state: stored.state,
            maxGuesses: stored.maxGuesses
          });
          return;
        }

        clearStoredGame();
        const start = await startPuzzle();
        if (!mounted) return;

        const freshState = createFreshRuntimeGame(start);
        setGame(freshState);
        persistGame(freshState);
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

  useEffect(() => {
    if (!game || !meta) return;
    if (!game.state.isSolved || game.token === seenWinToken) return;
    const solvedToken = game.token;
    const revealTailMs =
      Math.max(0, meta.attributes.length - 1) * REVEAL_STEP_MS +
      CELL_FLIP_DURATION_MS +
      ROW_CELEBRATION_DELAY_BUFFER_MS +
      ROW_CELEBRATION_DURATION_MS +
      WIN_MODAL_DELAY_BUFFER_MS;
    const timerId = window.setTimeout(() => {
      setSeenWinToken(solvedToken);
      setShowWinNotice(true);
    }, revealTailMs);

    return () => window.clearTimeout(timerId);
  }, [game, meta, seenWinToken]);

  const isInitializing = !meta || !game;

  const body = useMemo(() => {
    if (view === "reference") {
      return <ReferenceGuide onBack={() => setView("game")} theme={theme} onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))} />;
    }

    if (!meta || !game) return null;
    return (
      <Home
        meta={meta}
        roundId={game.roundId}
        keywordHint={game.hint}
        rows={game.rows}
        timerStartedAtMs={game.timerStartedAtMs}
        timerEndedAtMs={game.timerEndedAtMs}
        pending={pending}
        isOver={game.state.isOver}
        isSolved={game.state.isSolved}
        showLimitNotice={showLimitNotice}
        showWinNotice={showWinNotice}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onOpenReference={() => setView("reference")}
        onGuess={(guess) => {
          void handleGuess(guess);
        }}
        onGenerateKeyword={() => {
          void handleGenerateKeyword();
        }}
        onDismissLimitNotice={() => setShowLimitNotice(false)}
        onDismissWinNotice={() => setShowWinNotice(false)}
      />
    );
  }, [game, meta, pending, showLimitNotice, showWinNotice, theme, view]);

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
        roundId: game.roundId,
        guessId: guess.id,
        token: game.token
      });

      const now = Date.now();
      const timerStartedAtMs = game.timerStartedAtMs ?? now;
      const timerEndedAtMs = response.state.isOver ? game.timerEndedAtMs ?? now : null;

      const nextGame: RuntimeGame = {
        roundId: game.roundId,
        hint: game.hint,
        token: response.token,
        rows: [...game.rows, response.row],
        timerStartedAtMs,
        timerEndedAtMs,
        state: response.state,
        maxGuesses: game.maxGuesses
      };
      setGame(nextGame);
      persistGame(nextGame);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleGenerateKeyword(): Promise<void> {
    if (!meta || pending) return;

    try {
      setPending(true);
      setError(null);
      const start = await startPuzzle();
      const freshState = createFreshRuntimeGame(start);
      setGame(freshState);
      persistGame(freshState);
      setShowLimitNotice(false);
      setSeenLimitToken(null);
      setShowWinNotice(false);
      setSeenWinToken(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function persistGame(currentGame: RuntimeGame): void {
    const record: StoredGame = {
      roundId: currentGame.roundId,
      hint: currentGame.hint,
      token: currentGame.token,
      rows: currentGame.rows,
      timerStartedAtMs: currentGame.timerStartedAtMs,
      timerEndedAtMs: currentGame.timerEndedAtMs,
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

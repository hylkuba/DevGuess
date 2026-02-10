import { useEffect, useMemo, useState } from "react";
import { searchGuesses } from "../lib/apiClient";
import type { SearchResult } from "../lib/types";

type Props = {
  disabled: boolean;
  guessedIds: Set<string>;
  hintText: string;
  hintKey: string;
  onSubmit: (guess: SearchResult) => void;
};

export function GuessInput({ disabled, guessedIds, hintText, hintKey, onSubmit }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setShowHint(false);
  }, [hintKey]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await searchGuesses(query);
        setResults(response.results);
        setActiveIndex(0);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query]);

  const selectedResult = useMemo(() => {
    if (results.length === 0) return null;
    return results[Math.max(0, Math.min(activeIndex, results.length - 1))];
  }, [activeIndex, results]);

  const submit = (guess: SearchResult | null) => {
    if (disabled) return;
    if (!guess) {
      setError("Select a technology from the suggestions.");
      return;
    }
    if (guessedIds.has(guess.id)) {
      setError("That technology was already guessed.");
      return;
    }

    onSubmit(guess);
    setQuery("");
    setResults([]);
    setError(null);
  };

  return (
    <div className="guess-input-wrap">
      <label className="sr-only" htmlFor="guess-input">
        Guess a technology
      </label>
      <div className="guess-input-row">
        <input
          id="guess-input"
          autoComplete="off"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter") {
              event.preventDefault();
              submit(selectedResult);
            }
          }}
          placeholder="Type a tech name..."
        />
        <div className="guess-input-actions">
          <button type="button" disabled={disabled || loading} onClick={() => submit(selectedResult)}>
            Guess
          </button>
          <button
            type="button"
            className={`ghost-btn hint-toggle-btn ${showHint ? "hint-toggle-btn-active" : ""}`.trim()}
            onClick={() => setShowHint((value) => !value)}
            aria-pressed={showHint}
            disabled={!hintText}
          >
            Hint
          </button>
        </div>
      </div>
      {showHint ? <p className="keyword-hint-text">{hintText}</p> : null}
      {loading ? <p className="hint">Searching...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {results.length > 0 ? (
        <ul className="suggestions" role="listbox" aria-label="Guess suggestions">
          {results.map((result, index) => (
            <li key={result.id}>
              <button
                type="button"
                className={`suggestion-item ${index === activeIndex ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => submit(result)}
              >
                <span>{result.name}</span>
                <small>{result.kindHint}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

import type { StoredGame } from "./types";

const STORAGE_KEY = "devguess.state.v1";

export function loadStoredGame(): StoredGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredGame;
  } catch {
    return null;
  }
}

export function saveStoredGame(value: StoredGame): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearStoredGame(): void {
  localStorage.removeItem(STORAGE_KEY);
}


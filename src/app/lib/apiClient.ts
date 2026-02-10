import type { CatalogResponse, GuessResponse, MetaResponse, SearchResponse, StartResponse } from "./types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function fetchMeta(): Promise<MetaResponse> {
  return requestJson<MetaResponse>("/api/meta");
}

export async function searchGuesses(query: string): Promise<SearchResponse> {
  return requestJson<SearchResponse>("/api/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: query })
  });
}

export async function startPuzzle(): Promise<StartResponse> {
  return requestJson<StartResponse>("/api/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
}

export async function submitGuess(payload: { roundId: string; guessId: string; token: string }): Promise<GuessResponse> {
  return requestJson<GuessResponse>("/api/guess", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function fetchCatalog(): Promise<CatalogResponse> {
  return requestJson<CatalogResponse>("/api/catalog");
}

export type CellStatus = "green" | "yellow" | "gray";

export type YearHintBucket = "<=2" | "<=5" | ">5";

export type Cell = {
  status: CellStatus;
  hint?: {
    arrow?: "↑" | "↓";
    diff?: number;
    bucket?: YearHintBucket;
  };
};

export type GridRow = {
  guess: { id: string; name: string };
  cells: Record<string, Cell>;
  values?: Record<string, string>;
};

export type PuzzleAttribute = {
  key: string;
  label: string;
};

export type MetaResponse = {
  mode: "random";
  keywordPoolSize: number;
  maxGuesses: number;
  attributes: PuzzleAttribute[];
};

export type SearchResult = {
  id: string;
  name: string;
  kindHint: string;
};

export type SearchResponse = {
  results: SearchResult[];
};

export type StartResponse = {
  roundId: string;
  token: string;
  maxGuesses: number;
  hint: string;
};

export type GuessResponse = {
  row: GridRow;
  state: {
    remaining: number;
    isSolved: boolean;
    isOver: boolean;
  };
  token: string;
};

export type StoredGame = {
  roundId: string;
  hint: string;
  token: string;
  rows: GridRow[];
  state: {
    remaining: number;
    isSolved: boolean;
    isOver: boolean;
  };
  maxGuesses: number;
};

export type CatalogItem = {
  id: string;
  name: string;
  kindPath: string[];
  domains: string[];
  primaryUse: string[];
  platformTargets: string[];
  runtimes: string[];
  ecosystemPath: string[];
  primaryLanguage: string;
  license: string;
  stewardType: string;
  steward: string;
  initialReleaseYear: number;
  openSource: boolean;
};

export type CatalogResponse = {
  taxonomy: {
    kindTree: Record<string, string[]>;
    domains: string[];
    primaryUse: string[];
    platformTargets: string[];
    runtimes: string[];
    primaryLanguage: string[];
    licenses: string[];
    stewardType: string[];
    stewards: string[];
  };
  items: CatalogItem[];
};

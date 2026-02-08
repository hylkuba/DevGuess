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
};

export type PuzzleAttribute = {
  key: string;
  label: string;
};

export type MetaResponse = {
  puzzleId: string;
  puzzleNo: number;
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
  token: string;
  maxGuesses: number;
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
  puzzleId: string;
  token: string;
  rows: GridRow[];
  state: {
    remaining: number;
    isSolved: boolean;
    isOver: boolean;
  };
  maxGuesses: number;
};


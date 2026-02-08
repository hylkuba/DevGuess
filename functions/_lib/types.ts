import type { TechItem } from "./dataset.schema";

export type CellStatus = "green" | "yellow" | "gray";
export type YearHintBucket = "<=2" | "<=5" | ">5";

export type Cell = {
  status: CellStatus;
  hint?: {
    arrow?: "↑" | "↓";
    diff?: number;
    bucket?: YearHintBucket;
    reason?: string;
  };
};

export type GridRow = {
  guess: Pick<TechItem, "id" | "name">;
  cells: Record<string, Cell>;
};

export type GuessState = {
  remaining: number;
  isSolved: boolean;
  isOver: boolean;
};


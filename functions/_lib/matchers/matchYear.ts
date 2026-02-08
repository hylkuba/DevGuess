import type { Cell } from "../types";

type MatchYearOptions = {
  yellowDiff?: number;
  bucketDiffs?: [number, number];
};

export function matchYear(guess: number, answer: number, options: MatchYearOptions = {}): Cell {
  if (guess === answer) return { status: "green" };

  const yellowDiff = options.yellowDiff ?? 5;
  const [bucketA, bucketB] = options.bucketDiffs ?? [2, 5];
  const diff = Math.abs(guess - answer);
  const arrow: "↑" | "↓" = guess < answer ? "↑" : "↓";
  const bucket = diff <= bucketA ? "<=2" : diff <= bucketB ? "<=5" : ">5";

  return {
    status: diff <= yellowDiff ? "yellow" : "gray",
    hint: {
      arrow,
      diff,
      bucket
    }
  };
}


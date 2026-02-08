import type { Cell } from "../types";

type MatchSetOptions = {
  jaccardYellow?: number;
};

export function matchSet(guess: string[], answer: string[], options: MatchSetOptions = {}): Cell {
  const guessSet = new Set(guess);
  const answerSet = new Set(answer);

  if (guessSet.size === answerSet.size) {
    let allEqual = true;
    for (const value of guessSet) {
      if (!answerSet.has(value)) {
        allEqual = false;
        break;
      }
    }
    if (allEqual) return { status: "green" };
  }

  const intersection = new Set<string>();
  for (const value of guessSet) {
    if (answerSet.has(value)) intersection.add(value);
  }

  const unionCount = new Set([...guessSet, ...answerSet]).size;
  const jaccard = unionCount === 0 ? 1 : intersection.size / unionCount;
  const threshold = options.jaccardYellow ?? 0.34;

  if (intersection.size > 0 || jaccard >= threshold) {
    return {
      status: "yellow",
      hint: {
        reason: "partial-overlap"
      }
    };
  }

  return { status: "gray" };
}


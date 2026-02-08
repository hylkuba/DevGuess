import type { Cell } from "../types";

type MatchHierarchyOptions = {
  yellowLevel?: number;
};

export function matchHierarchy(guess: string[], answer: string[], options: MatchHierarchyOptions = {}): Cell {
  const yellowLevel = options.yellowLevel ?? 1;
  const maxComparable = Math.max(guess.length, answer.length);

  let allEqual = guess.length === answer.length;
  for (let i = 0; i < maxComparable; i += 1) {
    if (guess[i] !== answer[i]) {
      allEqual = false;
      break;
    }
  }
  if (allEqual) return { status: "green" };

  if (guess.length >= yellowLevel && answer.length >= yellowLevel) {
    let prefixEqual = true;
    for (let i = 0; i < yellowLevel; i += 1) {
      if (guess[i] !== answer[i]) {
        prefixEqual = false;
        break;
      }
    }

    if (prefixEqual) {
      return {
        status: "yellow",
        hint: {
          reason: "same-family"
        }
      };
    }
  }

  return { status: "gray" };
}


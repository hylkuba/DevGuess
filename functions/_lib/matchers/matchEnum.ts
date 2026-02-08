import type { Cell } from "../types";

type MatchEnumOptions = {
  groups?: Record<string, string>;
};

export function matchEnum(guess: string | number | boolean, answer: string | number | boolean, options?: MatchEnumOptions): Cell {
  if (guess === answer) return { status: "green" };

  if (options?.groups) {
    const guessGroup = options.groups[String(guess)];
    const answerGroup = options.groups[String(answer)];
    if (guessGroup && answerGroup && guessGroup === answerGroup) {
      return {
        status: "yellow",
        hint: { reason: "same-group" }
      };
    }
  }

  return { status: "gray" };
}


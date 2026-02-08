import type { TechItem } from "./dataset.schema";
import { licenseToPath } from "./license";
import { matchEnum } from "./matchers/matchEnum";
import { matchHierarchy } from "./matchers/matchHierarchy";
import { matchSet } from "./matchers/matchSet";
import { matchYear } from "./matchers/matchYear";
import type { GridRow } from "./types";

export function evaluateGuess(guess: TechItem, answer: TechItem): GridRow {
  const cells = {
    kindPath: matchHierarchy(guess.kindPath, answer.kindPath, { yellowLevel: 1 }),
    domains: matchSet(guess.domains, answer.domains, { jaccardYellow: 0.34 }),
    primaryUse: matchSet(guess.primaryUse, answer.primaryUse, { jaccardYellow: 0.34 }),
    platformTargets: matchSet(guess.platformTargets, answer.platformTargets, { jaccardYellow: 0.34 }),
    runtimes: matchSet(guess.runtimes, answer.runtimes, { jaccardYellow: 0.34 }),
    ecosystemPath: matchHierarchy(guess.ecosystemPath, answer.ecosystemPath, { yellowLevel: 1 }),
    primaryLanguage: matchEnum(guess.primaryLanguage, answer.primaryLanguage),
    licenseGroup: matchHierarchy(licenseToPath(guess.license), licenseToPath(answer.license), { yellowLevel: 1 }),
    stewardType: matchEnum(guess.stewardType, answer.stewardType),
    steward: matchEnum(guess.steward, answer.steward),
    initialReleaseYear: matchYear(guess.initialReleaseYear, answer.initialReleaseYear, {
      yellowDiff: 5,
      bucketDiffs: [2, 5]
    }),
    openSource: matchEnum(guess.openSource, answer.openSource)
  };

  return {
    guess: {
      id: guess.id,
      name: guess.name
    },
    cells
  };
}

export function isWinningRow(row: GridRow): boolean {
  return Object.values(row.cells).every((cell) => cell.status === "green");
}


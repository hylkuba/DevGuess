import type { TechItem } from "./dataset.schema";
import { licenseToPath } from "./license";
import { matchEnum } from "./matchers/matchEnum";
import { matchHierarchy } from "./matchers/matchHierarchy";
import { matchSet } from "./matchers/matchSet";
import { matchYear } from "./matchers/matchYear";
import type { GridRow } from "./types";

const tokenLabels: Record<string, string> = {
  "js-ts": "JS/TS",
  api: "API",
  iac: "IaC",
  "ci-cd": "CI/CD",
  oss: "OSS",
  jvm: "JVM",
  sql: "SQL",
  cpp: "C++",
  csharp: "C#"
};

function titleCaseWord(value: string): string {
  if (tokenLabels[value]) return tokenLabels[value];
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatSet(values: string[]): string {
  return values.map((value) => titleCaseWord(value)).join(", ");
}

function formatPath(values: string[]): string {
  return values.map((value) => titleCaseWord(value)).join(" > ");
}

export function evaluateGuess(guess: TechItem, answer: TechItem): GridRow {
  const domainMatch = matchSet(guess.domains, answer.domains, { jaccardYellow: 0.34 });

  const cells = {
    kindPath: matchHierarchy(guess.kindPath, answer.kindPath, { yellowLevel: 1 }),
    domains: domainMatch.status === "yellow" ? { status: "gray" } : domainMatch,
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

  const values = {
    kindPath: formatPath(guess.kindPath),
    domains: formatSet(guess.domains),
    primaryUse: formatSet(guess.primaryUse),
    platformTargets: formatSet(guess.platformTargets),
    runtimes: formatSet(guess.runtimes),
    ecosystemPath: formatPath(guess.ecosystemPath),
    primaryLanguage: titleCaseWord(guess.primaryLanguage),
    licenseGroup: guess.license,
    stewardType: titleCaseWord(guess.stewardType),
    steward: guess.steward,
    initialReleaseYear: String(guess.initialReleaseYear),
    openSource: guess.openSource ? "Open Source" : "Closed Source"
  };

  return {
    guess: {
      id: guess.id,
      name: guess.name
    },
    cells,
    values
  };
}

export function isWinningRow(row: GridRow): boolean {
  return Object.values(row.cells).every((cell) => cell.status === "green");
}

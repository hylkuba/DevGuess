import type { TechItem } from "./dataset.schema";

const tokenLabels: Record<string, string> = {
  "js-ts": "JS/TS",
  api: "API",
  iac: "IaC",
  "ci-cd": "CI/CD",
  oss: "OSS",
  jvm: "JVM",
  sql: "SQL",
  cpp: "C++",
  csharp: "C#",
  "data-processing": "data processing",
  "managed-cloud": "managed cloud"
};

function titleCaseWord(value: string): string {
  if (tokenLabels[value]) return tokenLabels[value];
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatList(values: string[], limit = 2): string {
  const items = values.slice(0, limit).map((value) => titleCaseWord(value));
  if (items.length === 0) return "unknown areas";
  if (items.length === 1) return items[0];
  return `${items[0]} and ${items[1]}`;
}

function formatPath(values: string[], limit = 2): string {
  return values
    .slice(0, limit)
    .map((value) => titleCaseWord(value))
    .join(" > ");
}

function decadeLabel(year: number): string {
  const start = Math.floor(year / 10) * 10;
  return `${start}s`;
}

function seedFromId(id: string): number {
  let seed = 0;
  for (let i = 0; i < id.length; i += 1) {
    seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  }
  return seed;
}

function pickDistinct(clues: string[], seed: number, count: number): string[] {
  const pool = [...clues];
  const picked: string[] = [];
  let cursor = seed || 1;

  while (pool.length > 0 && picked.length < count) {
    const index = cursor % pool.length;
    const [selected] = pool.splice(index, 1);
    if (selected) picked.push(selected);
    cursor = (cursor * 1_664_525 + 1_013_904_223) >>> 0;
  }

  return picked;
}

export function buildKeywordHint(item: TechItem): string {
  const categoryClue = `Category clue: ${formatPath(item.kindPath, 2)}.`;

  const optionalClues = [
    `It first appeared in the ${decadeLabel(item.initialReleaseYear)}.`,
    `Its ecosystem trail starts around ${formatPath(item.ecosystemPath, 2)}.`,
    `It is often used for ${formatList(item.primaryUse, 2)} work.`,
    `You usually see it in ${formatList(item.domains, 2)} contexts.`,
    `Typical runtime environments include ${formatList(item.runtimes, 2)}.`,
    `Common platform targets are ${formatList(item.platformTargets, 2)}.`,
    item.steward !== "Other" ? `A key steward is ${item.steward}.` : item.openSource ? "It is open-source." : "It is not open-source."
  ];

  const picked = pickDistinct(optionalClues, seedFromId(item.id), 2);
  return [categoryClue, ...picked].join(" ");
}

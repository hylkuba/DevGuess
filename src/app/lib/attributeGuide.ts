import type { PuzzleAttribute } from "./types";

type GuideEntry = {
  summary: string;
  detail: string;
  example: string;
};

const defaultGuide: GuideEntry = {
  summary: "General metadata used to compare your guess to today's answer.",
  detail: "Try combining this with two or three green columns to narrow candidates quickly.",
  example: "Use it as a tie-breaker after Kind and Language."
};

const guideByKey: Record<string, GuideEntry> = {
  kindPath: {
    summary: "What type of technology it is and which family it belongs to.",
    detail: "This is hierarchical. Matching the exact branch is strongest. Matching only the same top family is still helpful.",
    example: "Framework > Frontend vs Framework > Backend share the same family."
  },
  domains: {
    summary: "Primary problem spaces where the technology is commonly used.",
    detail: "This is a flat set comparison (no subgroups). Green requires an exact set match; non-exact sets are gray.",
    example: "frontend, backend, cloud."
  },
  primaryUse: {
    summary: "Main jobs the technology is intended to do.",
    detail: "Use this to distinguish tools that live in the same domain but serve different roles.",
    example: "ui, api, monitoring, iac."
  },
  platformTargets: {
    summary: "Where it typically runs or ships.",
    detail: "Great for separating web-only technologies from server, cloud, or multi-platform ones.",
    example: "web, server, mobile, cloud."
  },
  runtimes: {
    summary: "Execution environments the tech depends on.",
    detail: "Useful for narrowing from broad ecosystems by runtime constraints.",
    example: "browser, node, jvm, native, wasm."
  },
  ecosystemPath: {
    summary: "Language/ecosystem lineage and surrounding stack.",
    detail: "Also hierarchical. It helps split similar tools that come from different ecosystems.",
    example: "JavaScript > Node, Data > SQL."
  },
  primaryLanguage: {
    summary: "Main implementation or defining language.",
    detail: "Use this early. It quickly removes large groups of candidates.",
    example: "JS/TS, Python, Go, SQL."
  },
  licenseGroup: {
    summary: "License family and specific license.",
    detail: "Yellow means same license family (for example MIT/Apache/BSD). Green means exact same license.",
    example: "MIT, Apache-2.0, GPL, Proprietary."
  },
  stewardType: {
    summary: "What kind of organization maintains it.",
    detail: "Helps differentiate standards, community-led projects, and company-owned tech.",
    example: "community, foundation, company."
  },
  steward: {
    summary: "The primary steward organization.",
    detail: "Use this late-game to separate close candidates in the same ecosystem.",
    example: "Google, CNCF, Community, IETF."
  },
  initialReleaseYear: {
    summary: "The initial public release year.",
    detail: "Year hints tell whether the answer is newer or older than your guess.",
    example: "If hint says newer, guess a more recent technology."
  },
  openSource: {
    summary: "Whether the technology is open-source.",
    detail: "A fast binary split for many categories.",
    example: "Open Source or Closed Source."
  }
};

export function getAttributeGuide(key: string): GuideEntry {
  return guideByKey[key] ?? defaultGuide;
}

export function getDailyTip(puzzleNo: number): string {
  const tips = [
    "Start broad: Kind and Language usually eliminate the most options first.",
    "Use Year direction as a compass before spending guesses on minor differences.",
    "When two guesses look similar, compare Steward and License to separate them.",
    "If Domains stay gray, use Kind plus Runtime to pivot to a different ecosystem branch.",
    "Framework guesses become stronger when Platform and Runtime both align."
  ];
  return tips[Math.abs(puzzleNo) % tips.length];
}

export function withGuide(attributes: PuzzleAttribute[]): Array<PuzzleAttribute & GuideEntry> {
  return attributes.map((attribute) => ({
    ...attribute,
    ...getAttributeGuide(attribute.key)
  }));
}

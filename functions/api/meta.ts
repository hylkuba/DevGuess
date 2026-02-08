import { MAX_GUESSES } from "../_lib/gameConfig";
import { getPuzzleNo, getDateStrUTC } from "../_lib/selectAnswer";
import { jsonCacheForDay, serverError } from "../_lib/http";
import type { Env } from "../_lib/env";

const attributeMeta = [
  { key: "kindPath", label: "Kind" },
  { key: "domains", label: "Domains" },
  { key: "primaryUse", label: "Use" },
  { key: "platformTargets", label: "Platform" },
  { key: "runtimes", label: "Runtime" },
  { key: "ecosystemPath", label: "Ecosystem" },
  { key: "primaryLanguage", label: "Language" },
  { key: "licenseGroup", label: "License" },
  { key: "stewardType", label: "Steward Type" },
  { key: "steward", label: "Steward" },
  { key: "initialReleaseYear", label: "Year" },
  { key: "openSource", label: "OSS" }
];

export const onRequestGet = async ({ env }: { env: Env }) => {
  try {
    const dateStr = getDateStrUTC();
    const puzzleNo = getPuzzleNo(new Date(), env.PUZZLE_EPOCH ?? "2025-01-01");
    return jsonCacheForDay({
      puzzleId: dateStr,
      puzzleNo,
      maxGuesses: MAX_GUESSES,
      attributes: attributeMeta
    });
  } catch {
    return serverError();
  }
};

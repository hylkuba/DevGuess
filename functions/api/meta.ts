import { getDataset } from "../_lib/dataset";
import { MAX_GUESSES } from "../_lib/gameConfig";
import { jsonCacheForDay, serverError } from "../_lib/http";

const attributeMeta = [
  { key: "kindPath", label: "Kind" },
  { key: "domains", label: "Domains" },
  { key: "primaryUse", label: "Use" },
  { key: "platformTargets", label: "Platform" },
  { key: "runtimes", label: "Runtime" },
  { key: "ecosystemPath", label: "Ecosystem" },
  { key: "primaryLanguage", label: "Language" },
  { key: "licenseGroup", label: "License" },
  { key: "steward", label: "Steward" },
  { key: "initialReleaseYear", label: "Year" },
  { key: "openSource", label: "OSS" }
];

export const onRequestGet = async () => {
  try {
    return jsonCacheForDay({
      mode: "random",
      keywordPoolSize: getDataset().length,
      maxGuesses: MAX_GUESSES,
      attributes: attributeMeta
    });
  } catch {
    return serverError();
  }
};

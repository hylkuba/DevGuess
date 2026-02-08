import type { License } from "./dataset.schema";

export type LicensePath = [group: "Permissive" | "Copyleft" | "Proprietary" | "Other", leaf: License];

const licenseGroupMap: Record<License, LicensePath[0]> = {
  MIT: "Permissive",
  "Apache-2.0": "Permissive",
  BSD: "Permissive",
  MPL: "Copyleft",
  GPL: "Copyleft",
  AGPL: "Copyleft",
  Proprietary: "Proprietary",
  "Public-Domain": "Other",
  Mixed: "Other",
  Other: "Other"
};

export function licenseToPath(license: License): LicensePath {
  return [licenseGroupMap[license], license];
}


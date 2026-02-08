import type { TechItem } from "./dataset.schema";
import { hmacSha256 } from "./crypto";

export function getDateStrUTC(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getPuzzleNo(date = new Date(), epochDate = "2025-01-01"): number {
  const start = new Date(`${epochDate}T00:00:00.000Z`);
  const today = new Date(getDateStrUTC(date));
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  return Math.max(1, diffDays + 1);
}

export async function selectAnswer(
  params: {
    dateStr: string;
    datasetVersion: string;
    secretSalt: string;
  },
  dataset: TechItem[]
): Promise<TechItem> {
  if (dataset.length === 0) {
    throw new Error("Dataset is empty.");
  }

  const message = `${params.dateStr}:${params.datasetVersion}`;
  const digest = await hmacSha256(params.secretSalt, message);
  let n = 0n;
  for (let i = 0; i < 8; i += 1) {
    n = (n << 8n) + BigInt(digest[i]);
  }

  const index = Number(n % BigInt(dataset.length));
  return dataset[index];
}


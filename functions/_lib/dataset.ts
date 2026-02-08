import rawDataset from "../../data/tech-items.v1.json";
import { techDatasetSchema, type TechItem } from "./dataset.schema";

type SearchIndexEntry = {
  item: TechItem;
  tokens: string[];
};

const dataset = techDatasetSchema.parse(rawDataset);
const byId = new Map<string, TechItem>();
const searchIndex: SearchIndexEntry[] = [];

for (const item of dataset) {
  byId.set(item.id, item);
  searchIndex.push({
    item,
    tokens: [item.name, ...item.aliases, item.id].map((token) => normalize(token))
  });
}

if (byId.size !== dataset.length) {
  throw new Error("Dataset load failed: duplicate ids detected.");
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function scoreSearch(query: string, tokens: string[]): number {
  let score = 0;
  for (const token of tokens) {
    if (token === query) score += 120;
    else if (token.startsWith(query)) score += 50;
    else if (token.includes(query)) score += 20;
  }
  return score;
}

export function getDataset(): TechItem[] {
  return dataset;
}

export function getTechById(id: string): TechItem | undefined {
  return byId.get(id);
}

export function searchTech(query: string, limit = 10): Array<Pick<TechItem, "id" | "name" | "kindPath">> {
  const normalized = normalize(query);
  if (!normalized) return [];

  return searchIndex
    .map((entry) => ({
      item: entry.item,
      score: scoreSearch(normalized, entry.tokens)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.name.localeCompare(b.item.name);
    })
    .slice(0, limit)
    .map((entry) => ({
      id: entry.item.id,
      name: entry.item.name,
      kindPath: entry.item.kindPath
    }));
}


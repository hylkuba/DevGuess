import type { GridRow, PuzzleAttribute } from "./types";

const cellToEmoji: Record<"green" | "yellow" | "gray", string> = {
  green: "🟩",
  yellow: "🟨",
  gray: "⬛"
};

export function buildShareText(params: {
  puzzleNo: number;
  rows: GridRow[];
  attributes: PuzzleAttribute[];
  maxGuesses: number;
  solved: boolean;
  siteUrl?: string;
}): string {
  const attempts = params.rows.length;
  const score = params.solved ? `${attempts}/${params.maxGuesses}` : `X/${params.maxGuesses}`;
  const lines: string[] = [`DevGuess #${params.puzzleNo} ${score}`];

  for (const row of params.rows) {
    const cells = params.attributes.map((attribute) => {
      const cell = row.cells[attribute.key];
      if (!cell) return "⬛";
      if (attribute.key === "initialReleaseYear") {
        return cell.hint?.arrow === "↓" ? "⬇️" : "⬆️";
      }
      return cellToEmoji[cell.status];
    });
    lines.push(cells.join(""));
  }

  if (params.siteUrl) lines.push(params.siteUrl);
  return lines.join("\n");
}


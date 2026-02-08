import type { Cell as CellData } from "../lib/types";

type Props = {
  cell?: CellData;
  attributeKey: string;
  attributeLabel: string;
};

function getIcon(status: CellData["status"]): string {
  if (status === "green") return "✓";
  if (status === "yellow") return "•";
  return "×";
}

export function Cell({ cell, attributeKey, attributeLabel }: Props) {
  if (!cell) {
    return <td className="cell cell-empty">-</td>;
  }

  const statusLabel = cell.status === "green" ? "match" : cell.status === "yellow" ? "partial match" : "no match";
  const yearLabel =
    attributeKey === "initialReleaseYear" && cell.hint?.arrow
      ? `, year ${cell.hint.arrow === "↑" ? "higher" : "lower"} ${cell.hint.bucket ?? ""}`.trim()
      : "";

  return (
    <td className={`cell cell-${cell.status}`} aria-label={`${attributeLabel}: ${statusLabel}${yearLabel}`}>
      {attributeKey === "initialReleaseYear" ? (
        <span className="cell-year">
          <span>{cell.hint?.arrow ?? "•"}</span>
          <span>{cell.hint?.bucket ?? ""}</span>
        </span>
      ) : (
        <span className="cell-icon">{getIcon(cell.status)}</span>
      )}
    </td>
  );
}


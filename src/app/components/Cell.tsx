import type { CSSProperties } from "react";
import type { Cell as CellData } from "../lib/types";

type Props = {
  cell?: CellData;
  value?: string;
  attributeKey: string;
  attributeLabel: string;
  revealDelayMs?: number;
};

function getStatusAria(status: CellData["status"]): string {
  if (status === "green") return "exact match";
  if (status === "yellow") return "partial match";
  return "no match";
}

function getYearArrow(cell: CellData): "up" | "down" | null {
  const rawArrow = String(cell.hint?.arrow ?? "").trim().toLowerCase();
  if (!rawArrow) return null;
  if (rawArrow === "^" || rawArrow === "↑" || rawArrow === "â†‘" || rawArrow === "up") return "up";
  if (rawArrow === "v" || rawArrow === "↓" || rawArrow === "â†“" || rawArrow === "ˇ" || rawArrow === "down") return "down";
  return null;
}

export function Cell({ cell, value, attributeKey, attributeLabel, revealDelayMs }: Props) {
  if (!cell) {
    return <td className="cell cell-empty">-</td>;
  }

  const yearArrow = attributeKey === "initialReleaseYear" ? getYearArrow(cell) : null;
  const yearArrowGlyph = yearArrow === "up" ? "\u2191" : yearArrow === "down" ? "\u2193" : "";
  const displayValue = value ?? "Unknown";
  const ariaHintPart = yearArrow ? `, year hint ${yearArrow === "up" ? "up arrow" : "down arrow"}` : "";
  const revealStyle = revealDelayMs == null ? undefined : ({ animationDelay: `${revealDelayMs}ms` } as CSSProperties);
  const finalSurfaceClass = `cell-surface cell-surface-${cell.status}`;

  if (revealDelayMs != null) {
    return (
      <td className={`cell cell-${cell.status}`.trim()} aria-label={`${attributeLabel}: ${displayValue}, ${getStatusAria(cell.status)}${ariaHintPart}`}>
        <div className="cell-flip-card cell-flip-reveal" style={revealStyle}>
          <div className="cell-flip-face cell-flip-front" aria-hidden="true" />
          <div className={`cell-flip-face cell-flip-back ${finalSurfaceClass}`.trim()}>
            <div className="cell-content">
              <span className="cell-value">{displayValue}</span>
              {yearArrow ? <span className="cell-note">{yearArrowGlyph}</span> : null}
            </div>
          </div>
        </div>
      </td>
    );
  }

  return (
    <td className={`cell cell-${cell.status}`.trim()} aria-label={`${attributeLabel}: ${displayValue}, ${getStatusAria(cell.status)}${ariaHintPart}`}>
      <div className={finalSurfaceClass}>
        <div className="cell-content">
          <span className="cell-value">{displayValue}</span>
          {yearArrow ? <span className="cell-note">{yearArrowGlyph}</span> : null}
        </div>
      </div>
    </td>
  );
}

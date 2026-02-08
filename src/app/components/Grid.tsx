import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { GridRow, PuzzleAttribute } from "../lib/types";
import { getAttributeGuide } from "../lib/attributeGuide";
import { Cell } from "./Cell";

type Props = {
  attributes: PuzzleAttribute[];
  rows: GridRow[];
  pending: boolean;
};

export function Grid({ attributes, rows, pending }: Props) {
  const [revealingRowKey, setRevealingRowKey] = useState<string | null>(null);
  const prevCountRef = useRef(rows.length);

  useEffect(() => {
    if (rows.length > prevCountRef.current) {
      const rowIndex = rows.length - 1;
      const lastRow = rows[rowIndex];
      if (lastRow) {
        setRevealingRowKey(`${lastRow.guess.id}:${rowIndex}`);
      }
    }

    if (rows.length === 0) {
      setRevealingRowKey(null);
    }

    prevCountRef.current = rows.length;
  }, [rows]);

  return (
    <div className="grid-wrap" role="region" aria-label="Guess grid">
      <table className="grid-table">
        <thead>
          <tr>
            <th className="guess-col">Guess</th>
            {attributes.map((attribute) => {
              const guide = getAttributeGuide(attribute.key);
              return (
                <th key={attribute.key}>
                  <span className="col-head">
                    <span>{attribute.label}</span>
                    <span className="col-hint" title={`${guide.summary} ${guide.detail}`}>
                      i
                    </span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowKey = `${row.guess.id}:${rowIndex}`;
            const isRevealingRow = rowKey === revealingRowKey;
            const guessStyle = isRevealingRow ? ({ animationDelay: "0ms" } as CSSProperties) : undefined;

            return (
              <tr key={rowKey}>
                <th className={`guess-col guess-cell ${isRevealingRow ? "cell-reveal" : ""}`.trim()} style={guessStyle}>
                  {row.guess.name}
                </th>
                {attributes.map((attribute, attributeIndex) => (
                  <Cell
                    key={`${row.guess.id}:${attribute.key}`}
                    attributeKey={attribute.key}
                    attributeLabel={attribute.label}
                    cell={row.cells[attribute.key]}
                    value={row.values?.[attribute.key]}
                    revealDelayMs={isRevealingRow ? (attributeIndex + 1) * 120 : undefined}
                  />
                ))}
              </tr>
            );
          })}
          {pending ? (
            <tr>
              <th className="guess-col guess-cell">Checking...</th>
              {attributes.map((attribute) => (
                <td key={`pending:${attribute.key}`} className="cell cell-empty">
                  ...
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

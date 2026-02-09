import { useEffect, useRef, useState } from "react";
import type { GridRow, PuzzleAttribute } from "../lib/types";
import { getAttributeGuide } from "../lib/attributeGuide";
import { Cell } from "./Cell";

const REVEAL_STEP_MS = 160;

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
      const newestRow = rows.at(-1);
      if (newestRow) {
        setRevealingRowKey(newestRow.guess.id);
      }
    }

    if (rows.length === 0) {
      setRevealingRowKey(null);
    }

    prevCountRef.current = rows.length;
  }, [rows]);

  const displayRows = rows.slice().reverse();

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

          {displayRows.map((row) => {
            const rowKey = row.guess.id;
            const isRevealingRow = rowKey === revealingRowKey;

            return (
              <tr key={rowKey}>
                <th className="guess-col guess-cell">
                  <div className="guess-cell-content">{row.guess.name}</div>
                </th>
                {attributes.map((attribute, attributeIndex) => (
                  <Cell
                    key={`${rowKey}:${attribute.key}`}
                    attributeKey={attribute.key}
                    attributeLabel={attribute.label}
                    cell={row.cells[attribute.key]}
                    value={row.values?.[attribute.key]}
                    revealDelayMs={isRevealingRow ? attributeIndex * REVEAL_STEP_MS : undefined}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

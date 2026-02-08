import type { GridRow, PuzzleAttribute } from "../lib/types";
import { Cell } from "./Cell";

type Props = {
  attributes: PuzzleAttribute[];
  rows: GridRow[];
  pending: boolean;
};

export function Grid({ attributes, rows, pending }: Props) {
  return (
    <div className="grid-wrap" role="region" aria-label="Guess grid">
      <table className="grid-table">
        <thead>
          <tr>
            <th className="sticky-col">Guess</th>
            {attributes.map((attribute) => (
              <th key={attribute.key}>{attribute.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.guess.id + row.cells.initialReleaseYear?.hint?.diff}>
              <th className="sticky-col">{row.guess.name}</th>
              {attributes.map((attribute) => (
                <Cell
                  key={`${row.guess.id}:${attribute.key}`}
                  attributeKey={attribute.key}
                  attributeLabel={attribute.label}
                  cell={row.cells[attribute.key]}
                />
              ))}
            </tr>
          ))}
          {pending ? (
            <tr>
              <th className="sticky-col">Checking...</th>
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


import { useEffect, useRef, useState } from "react";
import { fetchCatalog } from "../lib/apiClient";
import { getAttributeGuide } from "../lib/attributeGuide";
import type { CatalogResponse, GridRow, PuzzleAttribute } from "../lib/types";
import { Cell } from "./Cell";

const REVEAL_STEP_MS = 160;

const tokenLabels: Record<string, string> = {
  "js-ts": "JS/TS",
  api: "API",
  iac: "IaC",
  "ci-cd": "CI/CD",
  oss: "OSS",
  jvm: "JVM",
  sql: "SQL",
  cpp: "C++",
  csharp: "C#"
};

type GroupGuideMap = Record<string, string[]>;

type HoverGuide = {
  attributeLabel: string;
  value: string;
  items: string[];
};

function formatToken(value: string): string {
  if (tokenLabels[value]) return tokenLabels[value];
  if (/^[A-Z0-9+./-]{2,}$/.test(value)) return value;

  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatPath(values: string[]): string {
  return values.map((value) => formatToken(value)).join(" > ");
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  );
}

function buildGroupGuideMap(catalog: CatalogResponse): GroupGuideMap {
  const kindPaths = sortedUnique(
    Object.entries(catalog.taxonomy.kindTree).flatMap(([topLevel, children]) => children.map((child) => `${topLevel} > ${child}`))
  );

  const ecosystemPaths = sortedUnique(catalog.items.map((item) => formatPath(item.ecosystemPath)));
  const years = sortedUnique(catalog.items.map((item) => String(item.initialReleaseYear)));

  return {
    kindPath: kindPaths,
    domains: sortedUnique(catalog.taxonomy.domains.map((value) => formatToken(value))),
    primaryUse: sortedUnique(catalog.taxonomy.primaryUse.map((value) => formatToken(value))),
    platformTargets: sortedUnique(catalog.taxonomy.platformTargets.map((value) => formatToken(value))),
    runtimes: sortedUnique(catalog.taxonomy.runtimes.map((value) => formatToken(value))),
    ecosystemPath: ecosystemPaths,
    primaryLanguage: sortedUnique(catalog.taxonomy.primaryLanguage.map((value) => formatToken(value))),
    licenseGroup: sortedUnique(catalog.taxonomy.licenses),
    license: sortedUnique(catalog.taxonomy.licenses),
    stewardType: sortedUnique(catalog.taxonomy.stewardType.map((value) => formatToken(value))),
    steward: sortedUnique(catalog.taxonomy.stewards),
    initialReleaseYear: years,
    openSource: ["Open Source", "Closed Source"]
  };
}

type Props = {
  attributes: PuzzleAttribute[];
  rows: GridRow[];
  pending: boolean;
};

export function Grid({ attributes, rows, pending }: Props) {
  const [revealingRowKey, setRevealingRowKey] = useState<string | null>(null);
  const [groupGuides, setGroupGuides] = useState<GroupGuideMap>({});
  const [hoverGuide, setHoverGuide] = useState<HoverGuide | null>(null);
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

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const catalog = await fetchCatalog();
        if (!mounted) return;
        setGroupGuides(buildGroupGuideMap(catalog));
      } catch {
        if (!mounted) return;
        setGroupGuides({});
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

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
                {attributes.map((attribute, attributeIndex) => {
                  const groupItems = groupGuides[attribute.key] ?? [];
                  const value = row.values?.[attribute.key] ?? "Unknown";

                  return (
                    <Cell
                      key={`${rowKey}:${attribute.key}`}
                      attributeKey={attribute.key}
                      attributeLabel={attribute.label}
                      cell={row.cells[attribute.key]}
                      value={value}
                      groupItems={groupItems}
                      onGroupHover={
                        groupItems.length > 0
                          ? () =>
                              setHoverGuide({
                                attributeLabel: attribute.label,
                                value,
                                items: groupItems
                              })
                          : undefined
                      }
                      onGroupLeave={groupItems.length > 0 ? () => setHoverGuide(null) : undefined}
                      revealDelayMs={isRevealingRow ? attributeIndex * REVEAL_STEP_MS : undefined}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {hoverGuide ? (
        <aside className="grid-hover-guide" aria-live="polite">
          <p className="grid-hover-guide-title">
            <strong>{hoverGuide.attributeLabel}</strong> group
          </p>
          <p className="grid-hover-guide-subtitle">for {hoverGuide.value}</p>
          <div className="grid-hover-guide-items">
            {hoverGuide.items.map((item) => (
              <span key={`${hoverGuide.attributeLabel}:${item}`} className="grid-hover-guide-chip">
                {item}
              </span>
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

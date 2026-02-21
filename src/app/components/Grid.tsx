import { useEffect, useRef, useState, type CSSProperties } from "react";
import { fetchCatalog } from "../lib/apiClient";
import { getAttributeGuide } from "../lib/attributeGuide";
import type { CatalogResponse, Cell as CellData, CellStatus, GridRow, PuzzleAttribute } from "../lib/types";
import { Cell } from "./Cell";

const REVEAL_STEP_MS = 160;
const CELL_FLIP_DURATION_MS = 900;
const ROW_CELEBRATION_DURATION_MS = 820;
const ROW_CELEBRATION_DELAY_BUFFER_MS = 80;
const GUESS_COLUMN_MIN_WIDTH_PX = 132;
const ATTRIBUTE_COLUMN_MIN_WIDTH_PX = 120;

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

type KindFamilyMap = Record<string, string[]>;
type LicenseFamilyMap = Record<string, string[]>;
type EcosystemFamilyMap = Record<string, string[]>;

type HoverGuideSection = {
  title: string;
  items: string[];
  tone?: "candidate";
};

type HoverGuide = {
  attributeLabel: string;
  value: string;
  message?: string;
  sections: HoverGuideSection[];
};

type HoverPopup = {
  guide: HoverGuide;
  top: number;
  left: number;
};

type HoverGuideData = {
  kindFamilies: KindFamilyMap;
  licenseFamilies: LicenseFamilyMap;
  licenseToFamily: Record<string, string>;
  ecosystemFamilies: EcosystemFamilyMap;
};

const SET_OVERLAP_ATTRIBUTES = new Set(["domains", "primaryUse", "platformTargets", "runtimes"]);
const LICENSE_FAMILY_TEMPLATE: Array<{ family: string; values: string[] }> = [
  { family: "Permissive", values: ["MIT", "Apache-2.0", "BSD"] },
  { family: "Copyleft", values: ["MPL", "GPL", "AGPL"] },
  { family: "Proprietary", values: ["Proprietary"] },
  { family: "Other", values: ["Public-Domain", "Mixed", "Other"] }
];

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

function splitPathValue(value: string): string[] {
  return value
    .split(">")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function splitSetValue(value: string): string[] {
  const seen = new Set<string>();
  const values = value
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  for (const entry of values) {
    const key = entry.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

function getYearDirection(cell: CellData): "up" | "down" | null {
  const rawArrow = String(cell.hint?.arrow ?? "").trim().toLowerCase();
  if (!rawArrow) return null;
  if (rawArrow === "^" || rawArrow === "\u2191" || rawArrow === "â†‘" || rawArrow === "up") return "up";
  if (rawArrow === "v" || rawArrow === "\u2193" || rawArrow === "â†“" || rawArrow === "\u02c7" || rawArrow === "down") return "down";
  return null;
}

function getPopupPosition(anchor: HTMLElement): { top: number; left: number } {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;
  const estimatedWidth = Math.min(560, Math.max(280, viewportWidth - margin * 2));
  const estimatedHeight = 260;

  const preferredLeft = rect.left + rect.width / 2 - estimatedWidth / 2;
  const left = Math.min(viewportWidth - estimatedWidth - margin, Math.max(margin, preferredLeft));
  const belowTop = rect.bottom + 10;
  const aboveTop = rect.top - estimatedHeight - 10;
  const top = belowTop + estimatedHeight <= viewportHeight - margin ? belowTop : Math.max(margin, aboveTop);

  return { top, left };
}

function buildLicenseFamilyData(licenses: string[]): {
  licenseFamilies: LicenseFamilyMap;
  licenseToFamily: Record<string, string>;
} {
  const available = new Set(licenses);
  const licenseFamilies: LicenseFamilyMap = {};
  const licenseToFamily: Record<string, string> = {};

  for (const group of LICENSE_FAMILY_TEMPLATE) {
    const members = group.values.filter((value) => available.has(value));
    if (members.length === 0) continue;
    licenseFamilies[group.family] = members;
    for (const member of members) {
      licenseToFamily[member] = group.family;
    }
  }

  const knownLicenses = new Set(Object.keys(licenseToFamily));
  const unknownLicenses = licenses.filter((value) => !knownLicenses.has(value));
  if (unknownLicenses.length > 0) {
    const mergedOther = sortedUnique([...(licenseFamilies.Other ?? []), ...unknownLicenses]);
    licenseFamilies.Other = mergedOther;
    for (const value of unknownLicenses) {
      licenseToFamily[value] = "Other";
    }
  }

  return { licenseFamilies, licenseToFamily };
}

function buildEcosystemFamilyData(items: CatalogResponse["items"]): EcosystemFamilyMap {
  const grouped = new Map<string, Set<string>>();

  for (const item of items) {
    const normalized = item.ecosystemPath.map((value) => formatToken(value)).filter(Boolean);
    if (normalized.length === 0) continue;

    const [parent] = normalized;
    const fullPath = normalized.join(" > ");
    const existing = grouped.get(parent) ?? new Set<string>();
    existing.add(fullPath);
    grouped.set(parent, existing);
  }

  return Object.fromEntries(
    Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right, undefined, { sensitivity: "base", numeric: true }))
      .map(([parent, members]) => [
        parent,
        Array.from(members).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base", numeric: true }))
      ])
  );
}

function buildHoverGuideData(catalog: CatalogResponse): HoverGuideData {
  const kindFamilies = Object.fromEntries(
    Object.entries(catalog.taxonomy.kindTree).map(([topLevel, children]) => [
      formatToken(topLevel),
      sortedUnique(children.map((child) => formatToken(child)))
    ])
  ) as KindFamilyMap;
  const sortedLicenses = sortedUnique(catalog.taxonomy.licenses);
  const { licenseFamilies, licenseToFamily } = buildLicenseFamilyData(sortedLicenses);
  const ecosystemFamilies = buildEcosystemFamilyData(catalog.items);

  return {
    kindFamilies,
    licenseFamilies,
    licenseToFamily,
    ecosystemFamilies
  };
}

function buildGreenHoverGuide(attributeLabel: string, value: string, sections: HoverGuideSection[] = []): HoverGuide {
  return {
    attributeLabel,
    value,
    message: "Correct pick.",
    sections
  };
}

function buildGroupedHoverGuide(params: {
  attributeLabel: string;
  value: string;
  status: CellStatus;
  parentGroup: string | null;
  options: string[];
}): HoverGuide | null {
  const { attributeLabel, value, status, parentGroup, options } = params;
  if (status === "gray") return null;

  if (status === "green") {
    const sections: HoverGuideSection[] = parentGroup
      ? [
          {
            title: "Parent group",
            items: [parentGroup]
          }
        ]
      : [];
    return buildGreenHoverGuide(attributeLabel, value, sections);
  }

  const sections: HoverGuideSection[] = [];
  if (parentGroup) {
    sections.push({
      title: "Parent group",
      items: [parentGroup]
    });
  }
  if (options.length > 0) {
    sections.push({
      title: "Possible options",
      items: options,
      tone: "candidate"
    });
  }

  return {
    attributeLabel,
    value,
    message: "It is not this chosen item, however it belongs to the correct group.",
    sections
  };
}

function buildKindHoverGuide(params: {
  attributeLabel: string;
  value: string;
  status: CellStatus;
  kindFamilies: KindFamilyMap;
}): HoverGuide | null {
  const { attributeLabel, value, status, kindFamilies } = params;
  if (status === "gray") return null;

  const [groupLabel, childLabel] = splitPathValue(value);
  if (!groupLabel) return buildGreenHoverGuide(attributeLabel, value);

  const matchedGroup =
    Object.keys(kindFamilies).find((group) => group.localeCompare(groupLabel, undefined, { sensitivity: "base" }) === 0) ?? groupLabel;
  const groupItems = kindFamilies[matchedGroup] ?? [];
  const normalizedChild = childLabel?.trim().toLowerCase();
  const options =
    status === "yellow"
      ? groupItems
          .filter((item) => item.toLowerCase() !== normalizedChild)
          .map((item) => `${matchedGroup} > ${item}`)
      : [];

  return buildGroupedHoverGuide({
    attributeLabel,
    value,
    status,
    parentGroup: matchedGroup,
    options
  });
}

function buildYearHoverGuide(params: {
  attributeLabel: string;
  value: string;
  status: CellStatus;
  cell: CellData;
}): HoverGuide | null {
  const { attributeLabel, value, status, cell } = params;
  if (status === "gray") return null;

  if (status === "green") return buildGreenHoverGuide(attributeLabel, value);

  const year = Number.parseInt(value, 10);
  if (!Number.isFinite(year)) return null;

  const direction = getYearDirection(cell);
  const isNewer = direction === "up";
  const isOlder = direction === "down";
  const intervalStart = isOlder ? year - 5 : isNewer ? year : year - 5;
  const intervalEnd = isNewer ? year + 5 : isOlder ? year : year + 5;
  const message = isNewer
    ? "Not the exact year. The answer is newer and within 5 years."
    : isOlder
      ? "Not the exact year. The answer is older and within 5 years."
      : "Not the exact year, but it is within 5 years.";
  const intervalLabel = `${Math.min(intervalStart, intervalEnd)} to ${Math.max(intervalStart, intervalEnd)}`;

  return {
    attributeLabel,
    value,
    message,
    sections: [
      {
        title: "Likely interval",
        items: [intervalLabel]
      }
    ]
  };
}

function findLicenseFamily(value: string, licenseToFamily: Record<string, string>): string | null {
  if (licenseToFamily[value]) return licenseToFamily[value];

  const normalized = value.trim().toLowerCase();
  for (const [license, family] of Object.entries(licenseToFamily)) {
    if (license.toLowerCase() === normalized) return family;
  }
  return null;
}

function buildLicenseHoverGuide(params: {
  attributeLabel: string;
  value: string;
  status: CellStatus;
  licenseFamilies: LicenseFamilyMap;
  licenseToFamily: Record<string, string>;
}): HoverGuide | null {
  const { attributeLabel, value, status, licenseFamilies, licenseToFamily } = params;
  if (status === "gray") return null;

  const family = findLicenseFamily(value, licenseToFamily);
  const familyMembers = family ? licenseFamilies[family] ?? [] : [];
  const normalizedValue = value.trim().toLowerCase();
  const options = status === "yellow" ? familyMembers.filter((member) => member.toLowerCase() !== normalizedValue) : [];

  return buildGroupedHoverGuide({
    attributeLabel,
    value,
    status,
    parentGroup: family,
    options
  });
}

function buildEcosystemHoverGuide(params: {
  attributeLabel: string;
  value: string;
  status: CellStatus;
  ecosystemFamilies: EcosystemFamilyMap;
}): HoverGuide | null {
  const { attributeLabel, value, status, ecosystemFamilies } = params;
  if (status === "gray") return null;

  const [groupLabel] = splitPathValue(value);
  if (!groupLabel) return buildGreenHoverGuide(attributeLabel, value);

  const matchedGroup =
    Object.keys(ecosystemFamilies).find((group) => group.localeCompare(groupLabel, undefined, { sensitivity: "base" }) === 0) ??
    groupLabel;
  const groupItems = ecosystemFamilies[matchedGroup] ?? [];
  const normalizedValue = value.trim().toLowerCase();
  const options = status === "yellow" ? groupItems.filter((item) => item.toLowerCase() !== normalizedValue) : [];

  return buildGroupedHoverGuide({
    attributeLabel,
    value,
    status,
    parentGroup: matchedGroup,
    options
  });
}

function buildSetOverlapHoverGuide(params: {
  attributeLabel: string;
  value: string;
  status: CellStatus;
}): HoverGuide | null {
  const { attributeLabel, value, status } = params;
  if (status === "gray") return null;
  if (status === "green") return buildGreenHoverGuide(attributeLabel, value);

  const chosenValues = splitSetValue(value);
  const sections: HoverGuideSection[] =
    chosenValues.length > 0
      ? [
          {
            title: "Chosen values",
            items: chosenValues,
            tone: "candidate"
          }
        ]
      : [];

  return {
    attributeLabel,
    value,
    message: "At least one of the chosen ones is correct.",
    sections
  };
}

function buildHoverGuide(params: {
  attributeKey: string;
  attributeLabel: string;
  value: string;
  cell: CellData;
  hoverData: HoverGuideData;
}): HoverGuide | null {
  const { attributeKey, attributeLabel, value, cell, hoverData } = params;
  if (cell.status === "gray") return null;

  if (attributeKey === "kindPath") {
    return buildKindHoverGuide({
      attributeLabel,
      value,
      status: cell.status,
      kindFamilies: hoverData.kindFamilies
    });
  }

  if (attributeKey === "ecosystemPath") {
    return buildEcosystemHoverGuide({
      attributeLabel,
      value,
      status: cell.status,
      ecosystemFamilies: hoverData.ecosystemFamilies
    });
  }

  if (attributeKey === "licenseGroup") {
    return buildLicenseHoverGuide({
      attributeLabel,
      value,
      status: cell.status,
      licenseFamilies: hoverData.licenseFamilies,
      licenseToFamily: hoverData.licenseToFamily
    });
  }

  if (attributeKey === "initialReleaseYear") {
    return buildYearHoverGuide({
      attributeLabel,
      value,
      status: cell.status,
      cell
    });
  }

  if (SET_OVERLAP_ATTRIBUTES.has(attributeKey)) {
    return buildSetOverlapHoverGuide({
      attributeLabel,
      value,
      status: cell.status
    });
  }

  if (cell.status === "green") return buildGreenHoverGuide(attributeLabel, value);
  return {
    attributeLabel,
    value,
    message: "At least one of the chosen ones is correct.",
    sections: []
  };
}

type Props = {
  attributes: PuzzleAttribute[];
  rows: GridRow[];
  pending: boolean;
  celebratingRowKey?: string | null;
};

export function Grid({ attributes, rows, pending, celebratingRowKey = null }: Props) {
  const [revealingRowKey, setRevealingRowKey] = useState<string | null>(null);
  const [activeCelebrationRowKey, setActiveCelebrationRowKey] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<HoverGuideData>({
    kindFamilies: {},
    licenseFamilies: {},
    licenseToFamily: {},
    ecosystemFamilies: {}
  });
  const [hoverPopup, setHoverPopup] = useState<HoverPopup | null>(null);
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

    setHoverPopup(null);

    prevCountRef.current = rows.length;
  }, [rows]);

  useEffect(() => {
    if (!revealingRowKey) return;

    const revealTailMs = Math.max(0, attributes.length - 1) * REVEAL_STEP_MS + CELL_FLIP_DURATION_MS;
    const timerId = window.setTimeout(() => {
      setRevealingRowKey((current) => (current === revealingRowKey ? null : current));
    }, revealTailMs);

    return () => window.clearTimeout(timerId);
  }, [attributes.length, revealingRowKey]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const catalog = await fetchCatalog();
        if (!mounted) return;
        setHoverData(buildHoverGuideData(catalog));
      } catch {
        if (!mounted) return;
        setHoverData({ kindFamilies: {}, licenseFamilies: {}, licenseToFamily: {}, ecosystemFamilies: {} });
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hoverPopup) return;

    const hide = () => setHoverPopup(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);

    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [hoverPopup]);

  useEffect(() => {
    if (!celebratingRowKey) {
      setActiveCelebrationRowKey(null);
      return;
    }

    setActiveCelebrationRowKey(celebratingRowKey);
    const revealTailMs =
      Math.max(0, attributes.length - 1) * REVEAL_STEP_MS + CELL_FLIP_DURATION_MS + ROW_CELEBRATION_DELAY_BUFFER_MS;
    const clearTimerMs = revealTailMs + ROW_CELEBRATION_DURATION_MS;
    const timerId = window.setTimeout(() => {
      setActiveCelebrationRowKey((current) => (current === celebratingRowKey ? null : current));
    }, clearTimerMs);

    return () => window.clearTimeout(timerId);
  }, [attributes.length, celebratingRowKey]);

  const displayRows = rows.slice().reverse();
  const tableMinWidth = GUESS_COLUMN_MIN_WIDTH_PX + attributes.length * ATTRIBUTE_COLUMN_MIN_WIDTH_PX;
  const tableStyle = { "--grid-table-min-width": `${tableMinWidth}px` } as CSSProperties;

  return (
    <div className="grid-wrap" role="region" aria-label="Guess grid">
      <div className="grid-scroll" aria-label="Scrollable guess grid">
        <table className="grid-table" style={tableStyle}>
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
              const isCelebrationRow = rowKey === activeCelebrationRowKey;
              const rowCelebrationDelayMs =
                Math.max(0, attributes.length - 1) * REVEAL_STEP_MS + CELL_FLIP_DURATION_MS + ROW_CELEBRATION_DELAY_BUFFER_MS;
              const rowStyle = isCelebrationRow
                ? ({ "--row-win-delay-ms": `${rowCelebrationDelayMs}ms` } as CSSProperties)
                : undefined;

              return (
                <tr key={rowKey} className={isCelebrationRow ? "grid-row-celebrate" : undefined} style={rowStyle}>
                  <th className="guess-col guess-cell">
                    <div className="guess-cell-content">{row.guess.name}</div>
                  </th>
                  {attributes.map((attribute, attributeIndex) => {
                    const cell = row.cells[attribute.key];
                    const value = row.values?.[attribute.key] ?? "Unknown";
                    const cellHoverGuide = cell
                      ? buildHoverGuide({
                          attributeKey: attribute.key,
                          attributeLabel: attribute.label,
                          value,
                          cell,
                          hoverData
                        })
                      : null;

                    return (
                      <Cell
                        key={`${rowKey}:${attribute.key}`}
                        attributeKey={attribute.key}
                        attributeLabel={attribute.label}
                        cell={cell}
                        value={value}
                        isHoverable={cellHoverGuide != null}
                        onGroupHover={
                          cellHoverGuide
                            ? (target) => {
                                const position = getPopupPosition(target);
                                setHoverPopup({
                                  guide: cellHoverGuide,
                                  top: position.top,
                                  left: position.left
                                });
                              }
                            : undefined
                        }
                        onGroupLeave={cellHoverGuide ? () => setHoverPopup(null) : undefined}
                        revealDelayMs={isRevealingRow ? attributeIndex * REVEAL_STEP_MS : undefined}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hoverPopup ? (
        <aside
          className="grid-hover-guide grid-hover-popup"
          aria-live="polite"
          style={{ top: `${hoverPopup.top}px`, left: `${hoverPopup.left}px` }}
        >
          <p className="grid-hover-guide-title">
            <strong>{hoverPopup.guide.attributeLabel}</strong> details
          </p>
          <p className="grid-hover-guide-subtitle">for {hoverPopup.guide.value}</p>
          {hoverPopup.guide.message ? <p className="grid-hover-guide-message">{hoverPopup.guide.message}</p> : null}
          {hoverPopup.guide.sections.map((section) => (
            <section key={`${hoverPopup.guide.attributeLabel}:${section.title}`} className="grid-hover-guide-section">
              <p className="grid-hover-guide-section-title">{section.title}</p>
              <div className="grid-hover-guide-items">
                {section.items.map((item) => (
                  <span
                    key={`${hoverPopup.guide.attributeLabel}:${section.title}:${item}`}
                    className={`grid-hover-guide-chip ${section.tone === "candidate" ? "grid-hover-guide-chip-candidate" : ""}`.trim()}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </aside>
      ) : null}
    </div>
  );
}

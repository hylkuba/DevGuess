import { useEffect, useRef, useState } from "react";
import { fetchCatalog } from "../lib/apiClient";
import { getAttributeGuide } from "../lib/attributeGuide";
import type { CatalogResponse, Cell as CellData, CellStatus, GridRow, PuzzleAttribute } from "../lib/types";
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
type KindFamilyMap = Record<string, string[]>;
type LicenseFamilyMap = Record<string, string[]>;

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

type HoverGuideData = {
  groups: GroupGuideMap;
  kindFamilies: KindFamilyMap;
  licenseFamilies: LicenseFamilyMap;
  licenseToFamily: Record<string, string>;
};

const YELLOW_CANDIDATE_ATTRIBUTES = new Set(["domains", "primaryUse", "platformTargets", "runtimes"]);
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

function buildHoverGuideData(catalog: CatalogResponse): HoverGuideData {
  const kindFamilies = Object.fromEntries(
    Object.entries(catalog.taxonomy.kindTree).map(([topLevel, children]) => [
      formatToken(topLevel),
      sortedUnique(children.map((child) => formatToken(child)))
    ])
  ) as KindFamilyMap;
  const sortedLicenses = sortedUnique(catalog.taxonomy.licenses);
  const { licenseFamilies, licenseToFamily } = buildLicenseFamilyData(sortedLicenses);

  const ecosystemPaths = sortedUnique(catalog.items.map((item) => formatPath(item.ecosystemPath)));

  return {
    groups: {
      domains: sortedUnique(catalog.taxonomy.domains.map((value) => formatToken(value))),
      primaryUse: sortedUnique(catalog.taxonomy.primaryUse.map((value) => formatToken(value))),
      platformTargets: sortedUnique(catalog.taxonomy.platformTargets.map((value) => formatToken(value))),
      runtimes: sortedUnique(catalog.taxonomy.runtimes.map((value) => formatToken(value))),
      ecosystemPath: ecosystemPaths,
      primaryLanguage: sortedUnique(catalog.taxonomy.primaryLanguage.map((value) => formatToken(value))),
      licenseGroup: sortedLicenses,
      license: sortedLicenses,
      stewardType: sortedUnique(catalog.taxonomy.stewardType.map((value) => formatToken(value))),
      steward: sortedUnique(catalog.taxonomy.stewards),
      openSource: ["Open Source", "Closed Source"]
    },
    kindFamilies,
    licenseFamilies,
    licenseToFamily
  };
}

function getExactMatchMessage(status: CellStatus): string | undefined {
  if (status !== "green") return undefined;
  return "This is the target value.";
}

function buildKindHoverGuide(params: {
  attributeLabel: string;
  value: string;
  status: CellStatus;
  kindFamilies: KindFamilyMap;
}): HoverGuide | null {
  const { attributeLabel, value, status, kindFamilies } = params;
  const [groupLabel] = splitPathValue(value);

  if (!groupLabel) {
    const message = getExactMatchMessage(status);
    if (!message) return null;
    return {
      attributeLabel,
      value,
      message,
      sections: []
    };
  }

  const matchedGroup =
    Object.keys(kindFamilies).find((group) => group.localeCompare(groupLabel, undefined, { sensitivity: "base" }) === 0) ?? groupLabel;
  const groupItems = kindFamilies[matchedGroup] ?? [];
  const message = getExactMatchMessage(status);

  if (groupItems.length === 0 && !message) return null;

  const sections: HoverGuideSection[] = [{ title: "Belongs to group", items: [matchedGroup] }];
  if (groupItems.length > 0) {
    sections.push({
      title: `${matchedGroup} items`,
      items: groupItems
    });
  }

  return {
    attributeLabel,
    value,
    message,
    sections
  };
}

function buildYearHoverGuide(params: { attributeLabel: string; value: string; status: CellStatus }): HoverGuide | null {
  const { attributeLabel, value, status } = params;
  const year = Number.parseInt(value, 10);
  if (!Number.isFinite(year)) return null;

  const intervalStart = year - 5;
  const intervalEnd = year + 5;
  const message =
    status === "green"
      ? "This is the target year."
      : status === "yellow"
        ? "The answer year belongs to this interval."
        : "The answer year does not belong to this interval.";

  return {
    attributeLabel,
    value,
    message,
    sections: [
      {
        title: "Checked interval",
        items: [`${intervalStart} - ${intervalEnd}`]
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
  const family = findLicenseFamily(value, licenseToFamily);
  const familyMembers = family ? licenseFamilies[family] ?? [] : [];

  const normalizedValue = value.trim().toLowerCase();
  const candidateLicenses =
    status === "yellow" ? familyMembers.filter((member) => member.toLowerCase() !== normalizedValue) : [];
  const message =
    status === "green"
      ? "This is the target license."
      : status === "yellow"
        ? "Same license group. At least one of these is correct."
        : undefined;

  const sections: HoverGuideSection[] = [];
  if (family) {
    sections.push({
      title: "Belongs to group",
      items: [family]
    });
  }
  if (candidateLicenses.length > 0) {
    sections.push({
      title: "Potential correct licenses",
      items: candidateLicenses,
      tone: "candidate"
    });
  }
  if (familyMembers.length > 0) {
    sections.push({
      title: `${family ?? "License"} group items`,
      items: familyMembers
    });
  }

  if (sections.length === 0 && !message) return null;

  return {
    attributeLabel,
    value,
    message,
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

  if (attributeKey === "kindPath") {
    return buildKindHoverGuide({
      attributeLabel,
      value,
      status: cell.status,
      kindFamilies: hoverData.kindFamilies
    });
  }

  if (attributeKey === "initialReleaseYear") {
    return buildYearHoverGuide({
      attributeLabel,
      value,
      status: cell.status
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

  const items = hoverData.groups[attributeKey] ?? [];
  const yellowCandidates =
    cell.status === "yellow" && YELLOW_CANDIDATE_ATTRIBUTES.has(attributeKey) ? splitSetValue(value) : [];
  const message =
    yellowCandidates.length > 0
      ? "At least one of these is correct."
      : getExactMatchMessage(cell.status);

  const sections: HoverGuideSection[] = [];
  if (yellowCandidates.length > 0) {
    sections.push({
      title: "Potential correct picks from your guess",
      items: yellowCandidates,
      tone: "candidate"
    });
  }
  if (items.length > 0) {
    sections.push({
      title: "Possible values",
      items
    });
  }
  if (sections.length === 0 && !message) return null;

  return {
    attributeLabel,
    value,
    message,
    sections
  };
}

type Props = {
  attributes: PuzzleAttribute[];
  rows: GridRow[];
  pending: boolean;
};

export function Grid({ attributes, rows, pending }: Props) {
  const [revealingRowKey, setRevealingRowKey] = useState<string | null>(null);
  const [hoverData, setHoverData] = useState<HoverGuideData>({
    groups: {},
    kindFamilies: {},
    licenseFamilies: {},
    licenseToFamily: {}
  });
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
        setHoverData(buildHoverGuideData(catalog));
      } catch {
        if (!mounted) return;
        setHoverData({ groups: {}, kindFamilies: {}, licenseFamilies: {}, licenseToFamily: {} });
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
                          ? () => {
                              setHoverGuide(cellHoverGuide);
                            }
                          : undefined
                      }
                      onGroupLeave={cellHoverGuide ? () => setHoverGuide(null) : undefined}
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
            <strong>{hoverGuide.attributeLabel}</strong> details
          </p>
          <p className="grid-hover-guide-subtitle">for {hoverGuide.value}</p>
          {hoverGuide.message ? <p className="grid-hover-guide-message">{hoverGuide.message}</p> : null}
          {hoverGuide.sections.map((section) => (
            <section key={`${hoverGuide.attributeLabel}:${section.title}`} className="grid-hover-guide-section">
              <p className="grid-hover-guide-section-title">{section.title}</p>
              <div className="grid-hover-guide-items">
                {section.items.map((item) => (
                  <span
                    key={`${hoverGuide.attributeLabel}:${section.title}:${item}`}
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

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchCatalog } from "../lib/apiClient";
import type { CatalogItem, CatalogResponse } from "../lib/types";

type Props = {
  onBack: () => void;
};

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

const filterColumns = [
  { key: "name", label: "Name" },
  { key: "kindPath", label: "Kind" },
  { key: "domains", label: "Domains" },
  { key: "primaryUse", label: "Use" },
  { key: "platformTargets", label: "Platform" },
  { key: "runtimes", label: "Runtime" },
  { key: "ecosystemPath", label: "Ecosystem" },
  { key: "primaryLanguage", label: "Language" },
  { key: "license", label: "License" },
  { key: "stewardType", label: "Steward Type" },
  { key: "steward", label: "Steward" },
  { key: "initialReleaseYear", label: "Year" },
  { key: "openSource", label: "OSS" }
] as const;

type FilterKey = (typeof filterColumns)[number]["key"];
type TaxonomyCard = { key: string; title: string; content: ReactNode; weight: number };

const filterKeys = filterColumns.map((column) => column.key) as FilterKey[];

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

function formatSet(values: string[]): string {
  return values.map((value) => formatToken(value)).join(", ");
}

function renderBoolean(value: boolean): string {
  return value ? "Open Source" : "Closed Source";
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  );
}

function estimateCardWeight(value: string): number {
  return Math.max(1, Math.ceil(value.length / 48));
}

function buildEmptyDrafts(): Record<FilterKey, string> {
  return Object.fromEntries(filterKeys.map((key) => [key, ""])) as Record<FilterKey, string>;
}

function buildEmptyFilters(): Record<FilterKey, string[]> {
  return Object.fromEntries(filterKeys.map((key) => [key, []])) as Record<FilterKey, string[]>;
}

function getFilterHaystack(item: CatalogItem, key: FilterKey): string {
  switch (key) {
    case "name":
      return [item.name, item.id].join(" ").toLowerCase();
    case "kindPath":
      return [item.kindPath.join(" > "), formatPath(item.kindPath)].join(" ").toLowerCase();
    case "domains":
      return [item.domains.join(" "), formatSet(item.domains)].join(" ").toLowerCase();
    case "primaryUse":
      return [item.primaryUse.join(" "), formatSet(item.primaryUse)].join(" ").toLowerCase();
    case "platformTargets":
      return [item.platformTargets.join(" "), formatSet(item.platformTargets)].join(" ").toLowerCase();
    case "runtimes":
      return [item.runtimes.join(" "), formatSet(item.runtimes)].join(" ").toLowerCase();
    case "ecosystemPath":
      return [item.ecosystemPath.join(" > "), formatPath(item.ecosystemPath)].join(" ").toLowerCase();
    case "primaryLanguage":
      return [item.primaryLanguage, formatToken(item.primaryLanguage)].join(" ").toLowerCase();
    case "license":
      return item.license.toLowerCase();
    case "stewardType":
      return [item.stewardType, formatToken(item.stewardType)].join(" ").toLowerCase();
    case "steward":
      return item.steward.toLowerCase();
    case "initialReleaseYear":
      return String(item.initialReleaseYear);
    case "openSource":
      return renderBoolean(item.openSource).toLowerCase();
    default:
      return "";
  }
}

export function ReferenceGuide({ onBack }: Props) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<FilterKey, string>>(buildEmptyDrafts);
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>(buildEmptyFilters);
  const [taxonomyColumnCount, setTaxonomyColumnCount] = useState(1);
  const taxonomyGridRef = useRef<HTMLDivElement | null>(null);
  const termsTableWrapRef = useRef<HTMLDivElement | null>(null);
  const termsDragStateRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0
  });

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchCatalog();
        if (!mounted) return;
        setCatalog(result);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const suggestionMap = useMemo(() => {
    const empty = buildEmptyFilters();
    if (!catalog) return empty;

    const years = sortedUnique(catalog.items.map((item) => String(item.initialReleaseYear)));

    return {
      name: sortedUnique(catalog.items.map((item) => item.name)),
      kindPath: sortedUnique(catalog.items.map((item) => formatPath(item.kindPath))),
      domains: sortedUnique(catalog.taxonomy.domains.map((value) => formatToken(value))),
      primaryUse: sortedUnique(catalog.taxonomy.primaryUse.map((value) => formatToken(value))),
      platformTargets: sortedUnique(catalog.taxonomy.platformTargets.map((value) => formatToken(value))),
      runtimes: sortedUnique(catalog.taxonomy.runtimes.map((value) => formatToken(value))),
      ecosystemPath: sortedUnique(catalog.items.map((item) => formatPath(item.ecosystemPath))),
      primaryLanguage: sortedUnique(catalog.taxonomy.primaryLanguage.map((value) => formatToken(value))),
      license: sortedUnique(catalog.taxonomy.licenses),
      stewardType: sortedUnique(catalog.taxonomy.stewardType.map((value) => formatToken(value))),
      steward: sortedUnique(catalog.taxonomy.stewards),
      initialReleaseYear: years,
      openSource: ["Open Source", "Closed Source"]
    };
  }, [catalog]);

  const filteredItems = useMemo(() => {
    if (!catalog) return [] as CatalogItem[];

    return catalog.items
      .filter((item) => {
        return filterKeys.every((key) => {
          const selected = filters[key];
          if (selected.length === 0) return true;

          const haystack = getFilterHaystack(item, key);
          return selected.some((entry) => haystack.includes(entry.toLowerCase()));
        });
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [catalog, filters]);

  const taxonomyCards = useMemo(() => {
    if (!catalog) return [] as TaxonomyCard[];

    const kindText = Object.entries(catalog.taxonomy.kindTree)
      .map(([topLevel, children]) => `${topLevel}: ${children.join(", ")}`)
      .join(" ");
    const domainsText = catalog.taxonomy.domains.map((value) => formatToken(value)).join(", ");
    const useText = catalog.taxonomy.primaryUse.map((value) => formatToken(value)).join(", ");
    const platformText = catalog.taxonomy.platformTargets.map((value) => formatToken(value)).join(", ");
    const runtimeText = catalog.taxonomy.runtimes.map((value) => formatToken(value)).join(", ");
    const ecosystemText = sortedUnique(catalog.items.map((item) => formatPath(item.ecosystemPath))).join(", ");
    const languageText = catalog.taxonomy.primaryLanguage.map((value) => formatToken(value)).join(", ");
    const licenseText = catalog.taxonomy.licenses.join(", ");
    const stewardTypeText = catalog.taxonomy.stewardType.map((value) => formatToken(value)).join(", ");
    const stewardText = catalog.taxonomy.stewards.join(", ");
    const yearText = `${Math.min(...catalog.items.map((item) => item.initialReleaseYear))} - ${Math.max(...catalog.items.map((item) => item.initialReleaseYear))}`;
    const ossText = "Open Source, Closed Source";

    const cards: TaxonomyCard[] = [
      {
        key: "kind",
        title: "Kind",
        content: (
          <ul>
            {Object.entries(catalog.taxonomy.kindTree).map(([topLevel, children]) => (
              <li key={topLevel}>
                <strong>{topLevel}:</strong> {children.join(", ")}
              </li>
            ))}
          </ul>
        ),
        weight: estimateCardWeight(kindText)
      },
      {
        key: "domains",
        title: "Domains",
        content: <p>{domainsText}</p>,
        weight: estimateCardWeight(domainsText)
      },
      {
        key: "use",
        title: "Use",
        content: <p>{useText}</p>,
        weight: estimateCardWeight(useText)
      },
      {
        key: "platform",
        title: "Platform",
        content: <p>{platformText}</p>,
        weight: estimateCardWeight(platformText)
      },
      {
        key: "runtime",
        title: "Runtime",
        content: <p>{runtimeText}</p>,
        weight: estimateCardWeight(runtimeText)
      },
      {
        key: "ecosystem",
        title: "Ecosystem",
        content: <p>{ecosystemText}</p>,
        weight: estimateCardWeight(ecosystemText)
      },
      {
        key: "language",
        title: "Language",
        content: <p>{languageText}</p>,
        weight: estimateCardWeight(languageText)
      },
      {
        key: "license",
        title: "License",
        content: <p>{licenseText}</p>,
        weight: estimateCardWeight(licenseText)
      },
      {
        key: "stewardType",
        title: "Steward Type",
        content: <p>{stewardTypeText}</p>,
        weight: estimateCardWeight(stewardTypeText)
      },
      {
        key: "steward",
        title: "Steward",
        content: <p>{stewardText}</p>,
        weight: estimateCardWeight(stewardText)
      },
      {
        key: "year",
        title: "Year",
        content: <p>{yearText}</p>,
        weight: estimateCardWeight(yearText)
      },
      {
        key: "oss",
        title: "OSS",
        content: <p>{ossText}</p>,
        weight: estimateCardWeight(ossText)
      }
    ];

    const shuffled = cards.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }

    return shuffled;
  }, [catalog]);

  useEffect(() => {
    const node = taxonomyGridRef.current;
    if (!node) return;

    const minColumnWidth = 250;
    const gapPx = 12;
    const recalcColumns = () => {
      const width = node.clientWidth;
      const nextColumnCount = Math.max(1, Math.floor((width + gapPx) / (minColumnWidth + gapPx)));
      setTaxonomyColumnCount((current) => (current === nextColumnCount ? current : nextColumnCount));
    };

    recalcColumns();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", recalcColumns);
      return () => window.removeEventListener("resize", recalcColumns);
    }

    const observer = new ResizeObserver(() => recalcColumns());
    observer.observe(node);
    return () => observer.disconnect();
  }, [catalog]);

  const taxonomyColumns = useMemo(() => {
    if (taxonomyCards.length === 0) return [] as TaxonomyCard[][];

    const columnCount = Math.max(1, Math.min(taxonomyCards.length, taxonomyColumnCount));
    const columns = Array.from({ length: columnCount }, () => [] as TaxonomyCard[]);
    const heights = Array.from({ length: columnCount }, () => 0);
    const orderedCards = taxonomyCards.slice().sort((a, b) => b.weight - a.weight);

    for (const card of orderedCards) {
      let targetColumn = 0;
      for (let index = 1; index < columnCount; index += 1) {
        if (heights[index] < heights[targetColumn]) targetColumn = index;
      }

      columns[targetColumn].push(card);
      heights[targetColumn] += card.weight;
    }

    return columns;
  }, [taxonomyCards, taxonomyColumnCount]);

  function addFilter(key: FilterKey, candidate?: string): void {
    const value = (candidate ?? drafts[key]).trim();
    if (!value) return;

    setFilters((prev) => {
      const exists = prev[key].some((entry) => entry.toLowerCase() === value.toLowerCase());
      if (exists) return prev;
      return {
        ...prev,
        [key]: [...prev[key], value]
      };
    });

    setDrafts((prev) => ({
      ...prev,
      [key]: ""
    }));
  }

  function handleFilterInputChange(key: FilterKey, nextValue: string): void {
    setDrafts((prev) => ({
      ...prev,
      [key]: nextValue
    }));

    const normalized = nextValue.trim().toLowerCase();
    if (!normalized) return;

    const isExactSuggestion = suggestionMap[key].some((value) => value.toLowerCase() === normalized);
    if (isExactSuggestion) {
      addFilter(key, nextValue);
    }
  }

  function removeFilter(key: FilterKey, value: string): void {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].filter((entry) => entry !== value)
    }));
  }

  function clearAllFilters(): void {
    setFilters(buildEmptyFilters());
    setDrafts(buildEmptyDrafts());
  }

  function endTermsDrag(pointerId?: number): void {
    const node = termsTableWrapRef.current;
    if (!node) return;

    if (typeof pointerId === "number" && node.hasPointerCapture(pointerId)) {
      node.releasePointerCapture(pointerId);
    }

    node.classList.remove("guide-table-wrap-dragging");
    termsDragStateRef.current = {
      active: false,
      pointerId: -1,
      startX: 0,
      startScrollLeft: 0
    };
  }

  function handleTermsPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, button, select, textarea, a, label")) {
      return;
    }

    const node = termsTableWrapRef.current;
    if (!node) return;

    termsDragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: node.scrollLeft
    };
    node.classList.add("guide-table-wrap-dragging");
    node.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handleTermsPointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const state = termsDragStateRef.current;
    if (!state.active || state.pointerId !== event.pointerId) return;

    const node = termsTableWrapRef.current;
    if (!node) return;

    const deltaX = event.clientX - state.startX;
    node.scrollLeft = state.startScrollLeft - deltaX;
    event.preventDefault();
  }

  function handleTermsPointerUp(event: React.PointerEvent<HTMLDivElement>): void {
    if (!termsDragStateRef.current.active || termsDragStateRef.current.pointerId !== event.pointerId) return;
    endTermsDrag(event.pointerId);
  }

  function handleTermsPointerCancel(event: React.PointerEvent<HTMLDivElement>): void {
    if (!termsDragStateRef.current.active || termsDragStateRef.current.pointerId !== event.pointerId) return;
    endTermsDrag(event.pointerId);
  }

  return (
    <main className="guide-shell">
      <header className="guide-header">
        <div>
          <h1>Reference DB</h1>
          <p>Category values and searchable terms.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onBack}>
          Back to Game
        </button>
      </header>

      {loading ? <p className="hint">Loading reference data...</p> : null}
      {error ? <p className="error-banner">{error}</p> : null}

      {catalog ? (
        <>
          <section className="guide-card">
            <h2>Category Values</h2>
            <div
              className="taxonomy-masonry-grid"
              ref={taxonomyGridRef}
              style={{ gridTemplateColumns: `repeat(${Math.max(1, taxonomyColumns.length)}, minmax(0, 1fr))` }}
            >
              {taxonomyColumns.map((columnCards, columnIndex) => (
                <div key={`taxonomy-column:${columnIndex}`} className="taxonomy-masonry-column">
                  {columnCards.map((card) => (
                    <article key={card.key} className="taxonomy-callout">
                      <h3>{card.title}</h3>
                      {card.content}
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="guide-card">
            <div className="terms-header-row">
              <h2>Terms Database ({filteredItems.length})</h2>
              <button type="button" className="ghost-btn" onClick={clearAllFilters}>
                Clear Filters
              </button>
            </div>

            <div
              className="guide-table-wrap"
              ref={termsTableWrapRef}
              onPointerDown={handleTermsPointerDown}
              onPointerMove={handleTermsPointerMove}
              onPointerUp={handleTermsPointerUp}
              onPointerCancel={handleTermsPointerCancel}
            >
              <table className="guide-table terms-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Kind</th>
                    <th>Domains</th>
                    <th>Use</th>
                    <th>Platform</th>
                    <th>Runtime</th>
                    <th>Ecosystem</th>
                    <th>Language</th>
                    <th>License</th>
                    <th>Steward Type</th>
                    <th>Steward</th>
                    <th>Year</th>
                    <th>OSS</th>
                  </tr>
                  <tr className="terms-filter-row">
                    {filterColumns.map((column) => {
                      const selected = filters[column.key];
                      const datalistOptions = suggestionMap[column.key].filter(
                        (value) => !selected.some((entry) => entry.toLowerCase() === value.toLowerCase())
                      );

                      return (
                        <th key={`filter:${column.key}`} className="terms-filter-cell">
                          <div className="terms-inline-filter">
                            <div className="table-filter-input-row">
                              <input
                                list={`terms-filter-suggestions-${column.key}`}
                                value={drafts[column.key]}
                                onChange={(event) => handleFilterInputChange(column.key, event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    addFilter(column.key);
                                  }
                                }}
                                placeholder="Filter"
                              />
                              <button type="button" className="ghost-btn terms-add-btn" onClick={() => addFilter(column.key)}>
                                Add
                              </button>
                            </div>
                            <datalist id={`terms-filter-suggestions-${column.key}`}>
                              {datalistOptions.map((value) => (
                                <option key={`${column.key}:${value}`} value={value} />
                              ))}
                            </datalist>
                            {selected.length > 0 ? (
                              <div className="terms-inline-selected">
                                {selected.map((value) => (
                                  <button
                                    key={`${column.key}:selected:${value}`}
                                    type="button"
                                    className="chip chip-active"
                                    onClick={() => removeFilter(column.key, value)}
                                  >
                                    {value}
                                    <span aria-hidden="true"> x</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{formatPath(item.kindPath)}</td>
                      <td>{formatSet(item.domains)}</td>
                      <td>{formatSet(item.primaryUse)}</td>
                      <td>{formatSet(item.platformTargets)}</td>
                      <td>{formatSet(item.runtimes)}</td>
                      <td>{formatPath(item.ecosystemPath)}</td>
                      <td>{formatToken(item.primaryLanguage)}</td>
                      <td>{item.license}</td>
                      <td>{formatToken(item.stewardType)}</td>
                      <td>{item.steward}</td>
                      <td>{item.initialReleaseYear}</td>
                      <td>{renderBoolean(item.openSource)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredItems.length === 0 ? <p className="hint">No terms match the current filters.</p> : null}
          </section>
        </>
      ) : null}
    </main>
  );
}

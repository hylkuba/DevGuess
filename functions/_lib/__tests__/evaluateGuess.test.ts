import { describe, expect, it } from "vitest";
import { getTechById } from "../dataset";
import { evaluateGuess } from "../evaluateGuess";

function requireItem(id: string) {
  const item = getTechById(id);
  if (!item) throw new Error(`Missing dataset item: ${id}`);
  return item;
}

describe("evaluateGuess", () => {
  it("evaluates react against nextjs", () => {
    const row = evaluateGuess(requireItem("react"), requireItem("nextjs"));

    expect(row.guess).toEqual({ id: "react", name: "React" });
    expect(row.cells.kindPath.status).toBe("yellow");
    expect(row.cells.ecosystemPath.status).toBe("green");
    expect(row.cells.primaryLanguage.status).toBe("green");
    expect(row.cells.initialReleaseYear.hint?.arrow).toBe("↑");

    expect(row.values.kindPath).toBe("Framework > Frontend");
    expect(row.values.primaryLanguage).toBe("JS/TS");
    expect(row.values.openSource).toBe("Open Source");
  });

  it("evaluates postgresql against mongodb", () => {
    const row = evaluateGuess(requireItem("postgresql"), requireItem("mongodb"));

    expect(row.guess).toEqual({ id: "postgresql", name: "PostgreSQL" });
    expect(row.cells.kindPath.status).toBe("yellow");
    expect(row.cells.domains.status).toBe("green");
    expect(row.cells.initialReleaseYear.status).toBe("gray");
    expect(row.cells.initialReleaseYear.hint?.arrow).toBe("↑");

    expect(row.values.kindPath).toBe("Database > Relational");
    expect(row.values.primaryLanguage).toBe("SQL");
    expect(row.values.licenseGroup).toBe("BSD");
  });
});


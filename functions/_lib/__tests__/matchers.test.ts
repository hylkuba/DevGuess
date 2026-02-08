import { describe, expect, it } from "vitest";
import { matchEnum } from "../matchers/matchEnum";
import { matchHierarchy } from "../matchers/matchHierarchy";
import { matchSet } from "../matchers/matchSet";
import { matchYear } from "../matchers/matchYear";

describe("matchEnum", () => {
  it("returns green for exact values", () => {
    expect(matchEnum("a", "a").status).toBe("green");
  });

  it("returns yellow for same synonym group", () => {
    expect(
      matchEnum("MIT", "Apache-2.0", {
        groups: { MIT: "Permissive", "Apache-2.0": "Permissive" }
      }).status
    ).toBe("yellow");
  });

  it("returns gray for mismatched values", () => {
    expect(matchEnum("a", "b").status).toBe("gray");
  });
});

describe("matchSet", () => {
  it("returns green when sets are equal", () => {
    expect(matchSet(["a", "b"], ["b", "a"]).status).toBe("green");
  });

  it("returns yellow when sets overlap", () => {
    expect(matchSet(["a"], ["a", "b"]).status).toBe("yellow");
  });

  it("returns gray when sets are disjoint", () => {
    expect(matchSet(["a"], ["b"]).status).toBe("gray");
  });
});

describe("matchHierarchy", () => {
  it("returns green for exact path", () => {
    expect(matchHierarchy(["Framework", "Frontend"], ["Framework", "Frontend"]).status).toBe("green");
  });

  it("returns yellow for matching parent", () => {
    expect(matchHierarchy(["Framework", "Backend"], ["Framework", "Frontend"], { yellowLevel: 1 }).status).toBe(
      "yellow"
    );
  });

  it("returns gray for disjoint path", () => {
    expect(matchHierarchy(["Database", "Relational"], ["Framework", "Frontend"]).status).toBe("gray");
  });
});

describe("matchYear", () => {
  it("returns green for exact year", () => {
    expect(matchYear(2020, 2020).status).toBe("green");
  });

  it("returns yellow within five years", () => {
    const result = matchYear(2018, 2021, { yellowDiff: 5, bucketDiffs: [2, 5] });
    expect(result.status).toBe("yellow");
    expect(result.hint?.arrow).toBe("↑");
    expect(result.hint?.bucket).toBe("<=5");
  });

  it("returns gray when far apart", () => {
    const result = matchYear(2000, 2021, { yellowDiff: 5, bucketDiffs: [2, 5] });
    expect(result.status).toBe("gray");
    expect(result.hint?.arrow).toBe("↑");
    expect(result.hint?.bucket).toBe(">5");
  });
});


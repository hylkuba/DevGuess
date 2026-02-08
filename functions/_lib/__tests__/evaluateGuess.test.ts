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
    expect(row).toMatchInlineSnapshot(`
      {
        "cells": {
          "domains": {
            "hint": {
              "reason": "partial-overlap",
            },
            "status": "yellow",
          },
          "ecosystemPath": {
            "status": "green",
          },
          "initialReleaseYear": {
            "hint": {
              "arrow": "↑",
              "bucket": "<=5",
              "diff": 3,
            },
            "status": "yellow",
          },
          "kindPath": {
            "hint": {
              "reason": "same-family",
            },
            "status": "yellow",
          },
          "licenseGroup": {
            "status": "green",
          },
          "openSource": {
            "status": "green",
          },
          "platformTargets": {
            "hint": {
              "reason": "partial-overlap",
            },
            "status": "yellow",
          },
          "primaryLanguage": {
            "status": "green",
          },
          "primaryUse": {
            "hint": {
              "reason": "partial-overlap",
            },
            "status": "yellow",
          },
          "runtimes": {
            "status": "green",
          },
          "steward": {
            "status": "gray",
          },
          "stewardType": {
            "status": "green",
          },
        },
        "guess": {
          "id": "react",
          "name": "React",
        },
      }
    `);
  });

  it("evaluates postgresql against mongodb", () => {
    const row = evaluateGuess(requireItem("postgresql"), requireItem("mongodb"));
    expect(row).toMatchInlineSnapshot(`
      {
        "cells": {
          "domains": {
            "status": "green",
          },
          "ecosystemPath": {
            "hint": {
              "reason": "same-family",
            },
            "status": "yellow",
          },
          "initialReleaseYear": {
            "hint": {
              "arrow": "↑",
              "bucket": ">5",
              "diff": 13,
            },
            "status": "gray",
          },
          "kindPath": {
            "hint": {
              "reason": "same-family",
            },
            "status": "yellow",
          },
          "licenseGroup": {
            "status": "gray",
          },
          "openSource": {
            "status": "gray",
          },
          "platformTargets": {
            "status": "green",
          },
          "primaryLanguage": {
            "status": "gray",
          },
          "primaryUse": {
            "status": "green",
          },
          "runtimes": {
            "status": "green",
          },
          "steward": {
            "status": "gray",
          },
          "stewardType": {
            "status": "gray",
          },
        },
        "guess": {
          "id": "postgresql",
          "name": "PostgreSQL",
        },
      }
    `);
  });
});

import { describe, expect, it } from "vitest";
import { canonicalTeamName, matchFingerprint, normalizeName } from "@/services/ingestion/normalizer";
import { validateMatch } from "@/services/ingestion/validator";

describe("ingestion normalization", () => {
  it("maps known team aliases to one canonical key", () => {
    expect(canonicalTeamName("Raja Club Athletic")).toBe("raja casablanca");
    expect(canonicalTeamName("Raja CA")).toBe("raja casablanca");
  });

  it("normalizes accents and punctuation", () => {
    expect(normalizeName("  Étoile—Sportive  ")).toBe("etoile sportive");
  });

  it("creates a stable match fingerprint", () => {
    expect(matchFingerprint({
      competition: "Botola Pro",
      season: "2024/25",
      homeTeam: "Raja CA",
      awayTeam: "Wydad AC",
      date: "2024-10-01T20:00:00Z",
    })).toBe("botola pro|2024/25|raja casablanca|wydad casablanca|2024-10-01");
  });
});

describe("ingestion validation", () => {
  it("rejects negative scores and identical teams", () => {
    const issues = validateMatch({
      competition: "Botola Pro",
      season: "2024/25",
      homeTeam: "Raja CA",
      awayTeam: "raja ca",
      homeScore: -1,
      awayScore: 0,
    });
    expect(issues.map((issue) => issue.code)).toEqual(["SAME_TEAM", "INVALID_SCORE"]);
  });
});

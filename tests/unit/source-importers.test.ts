import { describe, expect, it } from "vitest";
import { parseOpenfootballText, runOpenfootballPipeline } from "@/services/ingestion/openfootball";
import { fetchElbotolaSeasonMatches, runElbotolaPipeline } from "@/services/ingestion/elbotola";

const openfootballSample = `= Morocco | Botola Pro 1 2024/25
# Teams      2
# Matches    2
▪ Matchday 1
  Fri Aug 30 2024
    17:00  Difaâ d'el Jadida       v JS Soualem               1-1 (0-1)
           JS Soualem              v Difaâ d'el Jadida         0-2
`;

describe("public football source adapters", () => {
  it("parses openfootball matchday dates, accents, scores, and season", () => {
    const parsed = parseOpenfootballText(openfootballSample);
    expect(parsed.competition).toBe("Botola Pro");
    expect(parsed.sourceSeason).toBe("2024/25");
    expect(parsed.records).toHaveLength(2);
    expect(parsed.records[0]?.payload).toMatchObject({ home_team: "Difaâ d'el Jadida", away_team: "JS Soualem", date: "2024-08-30T17:00:00.000Z", home_score: "1", away_score: "1" });
    expect(runOpenfootballPipeline(openfootballSample, { sourceCode: "openfootball-world", datasetName: "test", datasetVersion: "2024/25" }).report.recordsAccepted).toBe(2);
  });

  it("fetches Elbotola match groups week-by-week and deduplicates repeated IDs", async () => {
    const calls: string[] = [];
    const response = {
      groups: [{ id: "2025-09-27Z", label: "Saturday, September 27", matches: [{ id: "match-1", href: "/en/analytics/match/match-1/", competitionName: "Morocco Botola 2", home: { name: "Team A" }, away: { name: "Team B" }, center: { home: 2, away: 1, dateLabel: "27/09/2025", live: false } }] }],
    };
    const fetched = await fetchElbotolaSeasonMatches({ seasonId: "season-1", maxWeeks: 10, delayMs: 250, fetchImpl: async (input) => { calls.push(String(input)); return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json" } }); } });
    expect(calls).toHaveLength(10);
    expect(fetched.matches).toHaveLength(1);
    expect(fetched.matches[0]).toMatchObject({ id: "match-1", homeScore: 2, awayScore: 1, homeTeam: "Team A", awayTeam: "Team B" });
    expect(runElbotolaPipeline(fetched, { sourceCode: "elbotola-public", datasetName: "test", datasetVersion: "2025/26" }).report.recordsAccepted).toBe(1);
  });

  it("rejects malformed Elbotola responses at the source boundary", async () => {
    await expect(fetchElbotolaSeasonMatches({ seasonId: "season-1", maxWeeks: 1, delayMs: 250, fetchImpl: async () => new Response(JSON.stringify({ groups: [{ id: "week-1", matches: [{ id: "match-1" }] }] }), { status: 200 }) })).rejects.toThrow();
  });
});

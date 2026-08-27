import type { PrismaClient } from "@prisma/client";
import type { CompletedMatch, PlayerMatchPerformance } from "@/services/analytics/types";

export type TeamSeasonAggregateRow = {
  seasonId: string;
  teamId: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  cleanSheets: number;
  bttsMatches: number;
};

export async function getCompletedMatchesForSeason(db: PrismaClient, seasonId: string): Promise<CompletedMatch[]> {
  const rows = await db.$queryRaw<Array<{
    id: string;
    seasonId: string;
    kickoffAt: Date | null;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
  }>>`
    SELECT "id", "seasonId", "kickoffAt", "homeTeamId", "awayTeamId", "homeScore", "awayScore"
    FROM "Match"
    WHERE "seasonId" = ${seasonId}::uuid
      AND "status" = 'COMPLETED'
      AND "homeScore" IS NOT NULL
      AND "awayScore" IS NOT NULL
    ORDER BY "kickoffAt" ASC NULLS LAST, "id" ASC
  `;
  return rows.map((row) => ({ ...row, homeScore: Number(row.homeScore), awayScore: Number(row.awayScore) }));
}

export async function getPlayerPerformancesForSeason(db: PrismaClient, seasonId: string): Promise<PlayerMatchPerformance[]> {
  const rows = await db.$queryRaw<Array<{
    matchId: string;
    playerId: string;
    teamId: string | null;
    minutes: number | null;
    goals: number | null;
    assists: number | null;
    xg: number | null;
    xa: number | null;
  }>>`
    SELECT p."matchId", p."playerId", p."teamId", p."minutes", p."goals", p."assists", p."xg",
           CAST(p."rawStats"->>'xa' AS DOUBLE PRECISION) AS "xa"
    FROM "PlayerMatchStat" p
    INNER JOIN "Match" m ON m."id" = p."matchId"
    WHERE m."seasonId" = ${seasonId}::uuid
      AND m."status" = 'COMPLETED'
    ORDER BY m."kickoffAt" ASC NULLS LAST, p."playerId" ASC
  `;
  return rows.map((row) => ({ ...row, minutes: nullableNumber(row.minutes), goals: nullableNumber(row.goals), assists: nullableNumber(row.assists), xg: nullableNumber(row.xg), xa: nullableNumber(row.xa) }));
}

export async function aggregateTeamSeasonRows(db: PrismaClient, seasonId: string): Promise<TeamSeasonAggregateRow[]> {
  return db.$queryRaw<TeamSeasonAggregateRow[]>`
    WITH team_matches AS (
      SELECT "seasonId" AS "seasonId", "homeTeamId" AS "teamId", "homeScore" AS "goalsFor", "awayScore" AS "goalsAgainst"
      FROM "Match"
      WHERE "seasonId" = ${seasonId}::uuid AND "status" = 'COMPLETED' AND "homeScore" IS NOT NULL AND "awayScore" IS NOT NULL
      UNION ALL
      SELECT "seasonId", "awayTeamId", "awayScore", "homeScore"
      FROM "Match"
      WHERE "seasonId" = ${seasonId}::uuid AND "status" = 'COMPLETED' AND "homeScore" IS NOT NULL AND "awayScore" IS NOT NULL
    )
    SELECT
      "seasonId",
      "teamId",
      COUNT(*)::int AS "matches",
      COUNT(*) FILTER (WHERE "goalsFor" > "goalsAgainst")::int AS "wins",
      COUNT(*) FILTER (WHERE "goalsFor" = "goalsAgainst")::int AS "draws",
      COUNT(*) FILTER (WHERE "goalsFor" < "goalsAgainst")::int AS "losses",
      COALESCE(SUM("goalsFor"), 0)::int AS "goalsFor",
      COALESCE(SUM("goalsAgainst"), 0)::int AS "goalsAgainst",
      COALESCE(SUM(CASE WHEN "goalsFor" > "goalsAgainst" THEN 3 WHEN "goalsFor" = "goalsAgainst" THEN 1 ELSE 0 END), 0)::int AS "points",
      COUNT(*) FILTER (WHERE "goalsAgainst" = 0)::int AS "cleanSheets",
      COUNT(*) FILTER (WHERE "goalsFor" > 0 AND "goalsAgainst" > 0)::int AS "bttsMatches"
    FROM team_matches
    GROUP BY "seasonId", "teamId"
    ORDER BY "points" DESC, (SUM("goalsFor") - SUM("goalsAgainst")) DESC, "teamId" ASC
  `;
}

function nullableNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

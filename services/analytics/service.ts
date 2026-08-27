import type { PrismaClient } from "@prisma/client";
import { aggregateTeamSeasonRows, getCompletedMatchesForSeason, getPlayerPerformancesForSeason } from "@/repositories/analytics.repository";
import { calculateEloRatings, calculatePlayerSeasonMetrics, calculateTeamSeasonMetrics } from "./metrics";
import type { PlayerSeasonMetrics, TeamSeasonMetrics } from "./types";

export type SeasonAnalytics = {
  seasonId: string;
  teams: TeamSeasonMetrics[];
  players: PlayerSeasonMetrics[];
  sqlAggregateRows: Awaited<ReturnType<typeof aggregateTeamSeasonRows>>;
};

export async function buildSeasonAnalytics(db: PrismaClient, seasonId: string): Promise<SeasonAnalytics> {
  const [matches, performances, sqlAggregateRows] = await Promise.all([
    getCompletedMatchesForSeason(db, seasonId),
    getPlayerPerformancesForSeason(db, seasonId),
    aggregateTeamSeasonRows(db, seasonId),
  ]);
  const eloRatings = calculateEloRatings(matches);
  const teamIds = new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]));
  const teams = [...teamIds].map((teamId) => calculateTeamSeasonMetrics(seasonId, teamId, matches, eloRatings));
  return {
    seasonId,
    teams,
    players: calculatePlayerSeasonMetrics(seasonId, performances),
    sqlAggregateRows,
  };
}

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
  const teamIds = [...new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]))];
  const playerIds = [...new Set(performances.map((performance) => performance.playerId))];
  const [teamRows, playerRows] = await Promise.all([
    teamIds.length > 0 ? db.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, canonicalName: true, shortName: true } }) : [],
    playerIds.length > 0 ? db.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, canonicalName: true } }) : [],
  ]);
  const teamNames = new Map(teamRows.map((team) => [team.id, team]));
  const playerNames = new Map(playerRows.map((player) => [player.id, player.canonicalName]));
  const eloRatings = calculateEloRatings(matches);
  const teams = teamIds.map((teamId) => {
    const metrics = calculateTeamSeasonMetrics(seasonId, teamId, matches, eloRatings);
    const team = teamNames.get(teamId);
    return { ...metrics, teamName: team?.canonicalName ?? `Team ${teamId.slice(0, 8)}`, teamShortName: team?.shortName ?? null };
  });
  const players = calculatePlayerSeasonMetrics(seasonId, performances).map((metrics) => {
    const source = performances.find((performance) => performance.playerId === metrics.playerId);
    return { ...metrics, playerName: playerNames.get(metrics.playerId) ?? `Player ${metrics.playerId.slice(0, 8)}`, playerTeamName: source?.teamId ? teamNames.get(source.teamId)?.canonicalName ?? null : null };
  });
  return { seasonId, teams, players, sqlAggregateRows };
}

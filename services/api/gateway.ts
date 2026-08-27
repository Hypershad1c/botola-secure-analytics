import type { PrismaClient } from "@prisma/client";
import { getOrSetCached } from "@/lib/cache";
import { buildSeasonAnalytics, type SeasonAnalytics } from "@/services/analytics/service";
import { paginate, type PaginationMeta } from "./contracts";

export class AnalyticsNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsNotFoundError";
  }
}

export type GatewayListResult<T> = {
  data: T[];
  pagination: PaginationMeta;
  methodologyVersion: string | undefined;
  cached: boolean;
};

export type GatewayDetailResult<T> = {
  data: T;
  methodologyVersion: string | undefined;
  cached: boolean;
};

export async function getSeasonAnalytics(db: PrismaClient, seasonId: string): Promise<{ data: SeasonAnalytics; cached: boolean }> {
  const result = await getOrSetCached(`analytics:season:${seasonId}`, 30_000, () => buildSeasonAnalytics(db, seasonId));
  return { data: result.value, cached: result.cached };
}

export async function listTeamAnalytics(db: PrismaClient, seasonId: string, page: number, pageSize: number): Promise<GatewayListResult<SeasonAnalytics["teams"][number]>> {
  const result = await getSeasonAnalytics(db, seasonId);
  const pageResult = paginate([...result.data.teams].sort((left, right) => right.points - left.points || right.goalDifference - left.goalDifference || left.teamId.localeCompare(right.teamId)), page, pageSize);
  return { data: pageResult.data, pagination: pageResult.meta, methodologyVersion: result.data.teams[0]?.methodologyVersion, cached: result.cached };
}

export async function getTeamAnalytics(db: PrismaClient, seasonId: string, teamId: string): Promise<GatewayDetailResult<SeasonAnalytics["teams"][number]>> {
  const result = await getSeasonAnalytics(db, seasonId);
  const data = result.data.teams.find((team) => team.teamId === teamId);
  if (!data) throw new AnalyticsNotFoundError("Team analytics were not found for this season.");
  return { data, methodologyVersion: data.methodologyVersion, cached: result.cached };
}

export async function listPlayerAnalytics(db: PrismaClient, seasonId: string, page: number, pageSize: number): Promise<GatewayListResult<SeasonAnalytics["players"][number]>> {
  const result = await getSeasonAnalytics(db, seasonId);
  const pageResult = paginate([...result.data.players].sort((left, right) => (right.performanceScore ?? -1) - (left.performanceScore ?? -1) || left.playerId.localeCompare(right.playerId)), page, pageSize);
  return { data: pageResult.data, pagination: pageResult.meta, methodologyVersion: result.data.players[0]?.methodologyVersion, cached: result.cached };
}

export async function getPlayerAnalytics(db: PrismaClient, seasonId: string, playerId: string): Promise<GatewayDetailResult<SeasonAnalytics["players"][number]>> {
  const result = await getSeasonAnalytics(db, seasonId);
  const data = result.data.players.find((player) => player.playerId === playerId);
  if (!data) throw new AnalyticsNotFoundError("Player analytics were not found for this season.");
  return { data, methodologyVersion: data.methodologyVersion, cached: result.cached };
}

export async function getStandings(db: PrismaClient, seasonId: string, page: number, pageSize: number): Promise<GatewayListResult<SeasonAnalytics["teams"][number]>> {
  return listTeamAnalytics(db, seasonId, page, pageSize);
}

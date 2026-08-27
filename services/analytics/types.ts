export type CompletedMatch = {
  id: string;
  seasonId: string;
  kickoffAt: Date | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

export type TeamMatchResult = {
  matchId: string;
  teamId: string;
  opponentId: string;
  kickoffAt: Date | null;
  venue: "HOME" | "AWAY";
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  result: "W" | "D" | "L";
};

export type TeamSeasonMetrics = {
  seasonId: string;
  teamId: string;
  teamName?: string;
  teamShortName?: string | null;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  pointsPerMatch: number | null;
  goalsPerMatch: number | null;
  concededPerMatch: number | null;
  cleanSheets: number;
  bttsMatches: number;
  home: SplitMetrics;
  away: SplitMetrics;
  form5: string;
  form10: string;
  recentForm: string;
  elo: number;
  momentum: number | null;
  consistency: number | null;
  strengthOfSchedule: number | null;
  attackRating: number | null;
  defenseRating: number | null;
  methodologyVersion: string;
};

export type SplitMetrics = {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  pointsPerMatch: number | null;
};

export type PlayerMatchPerformance = {
  matchId: string;
  playerId: string;
  teamId: string | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xa: number | null;
};

export type PlayerSeasonMetrics = {
  seasonId: string;
  playerId: string;
  playerName?: string;
  playerTeamName?: string | null;
  matches: number;
  starts: number | null;
  minutes: number;
  goals: number;
  assists: number;
  xg: number | null;
  xa: number | null;
  goalsPer90: number | null;
  assistsPer90: number | null;
  performanceScore: number | null;
  consistency: number | null;
  methodologyVersion: string;
};

export const ANALYTICS_METHODOLOGY_VERSION = "phase-3-v1";

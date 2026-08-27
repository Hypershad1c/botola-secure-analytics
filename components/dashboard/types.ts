export type TeamAnalytics = {
  seasonId: string;
  teamId: string;
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

export type PlayerAnalytics = {
  seasonId: string;
  playerId: string;
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

export type ApiResponse<T> = {
  data: T;
  meta: {
    requestId: string;
    cached: boolean;
    methodologyVersion?: string;
    pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  };
};

export type ApiError = {
  error: { code: string; message: string; issues?: Array<{ path: unknown[]; code: string; message: string }> };
  meta?: { requestId?: string };
};

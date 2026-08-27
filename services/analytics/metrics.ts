import { ANALYTICS_METHODOLOGY_VERSION, type CompletedMatch, type PlayerMatchPerformance, type PlayerSeasonMetrics, type SplitMetrics, type TeamMatchResult, type TeamSeasonMetrics } from "./types";

export function toTeamMatchResults(matches: CompletedMatch[]): TeamMatchResult[] {
  return matches.flatMap((match) => {
    const home = resultFor(match, match.homeTeamId, match.awayTeamId, "HOME", match.homeScore, match.awayScore);
    const away = resultFor(match, match.awayTeamId, match.homeTeamId, "AWAY", match.awayScore, match.homeScore);
    return [home, away];
  }).sort((left, right) => dateValue(left.kickoffAt) - dateValue(right.kickoffAt));
}

export function calculateTeamSeasonMetrics(
  seasonId: string,
  teamId: string,
  matches: CompletedMatch[],
  eloRatings: Map<string, number> = new Map(),
): TeamSeasonMetrics {
  const results = toTeamMatchResults(matches).filter((result) => result.teamId === teamId);
  const home = splitMetrics(results.filter((result) => result.venue === "HOME"));
  const away = splitMetrics(results.filter((result) => result.venue === "AWAY"));
  const total = splitMetrics(results);
  const recent = results.slice(-10);
  const opponentRatings = results.map((result) => eloRatings.get(result.opponentId) ?? 1500);
  const avgGoalsFor = total.matches > 0 ? total.goalsFor / total.matches : null;
  const avgGoalsAgainst = total.matches > 0 ? total.goalsAgainst / total.matches : null;
  const leagueGoalsPerMatch = leagueAverage(matches);
  const attackRating = avgGoalsFor !== null && leagueGoalsPerMatch !== null && leagueGoalsPerMatch > 0 ? round(100 * avgGoalsFor / leagueGoalsPerMatch) : null;
  const defenseRating = avgGoalsAgainst !== null && leagueGoalsPerMatch !== null && avgGoalsAgainst > 0 ? round(100 * leagueGoalsPerMatch / avgGoalsAgainst) : avgGoalsAgainst === 0 && leagueGoalsPerMatch !== null ? 200 : null;

  return {
    seasonId,
    teamId,
    matches: total.matches,
    wins: total.wins,
    draws: total.draws,
    losses: total.losses,
    goalsFor: total.goalsFor,
    goalsAgainst: total.goalsAgainst,
    goalDifference: total.goalsFor - total.goalsAgainst,
    points: total.points,
    pointsPerMatch: ratio(total.points, total.matches),
    goalsPerMatch: ratio(total.goalsFor, total.matches),
    concededPerMatch: ratio(total.goalsAgainst, total.matches),
    cleanSheets: results.filter((result) => result.goalsAgainst === 0).length,
    bttsMatches: results.filter((result) => result.goalsFor > 0 && result.goalsAgainst > 0).length,
    home,
    away,
    form5: results.slice(-5).map((result) => result.result).join("") || "",
    form10: results.slice(-10).map((result) => result.result).join("") || "",
    recentForm: results.slice(-5).map((result) => result.result).join("") || "",
    elo: eloRatings.get(teamId) ?? 1500,
    momentum: calculateMomentum(results),
    consistency: calculateConsistency(recent),
    strengthOfSchedule: opponentRatings.length > 0 ? round(opponentRatings.reduce((sum, value) => sum + value, 0) / opponentRatings.length) : null,
    attackRating,
    defenseRating,
    methodologyVersion: ANALYTICS_METHODOLOGY_VERSION,
  };
}

export function calculateEloRatings(matches: CompletedMatch[], initialRating = 1500, kFactor = 20, homeAdvantage = 50): Map<string, number> {
  const ratings = new Map<string, number>();
  const ordered = [...matches].sort((left, right) => dateValue(left.kickoffAt) - dateValue(right.kickoffAt) || left.id.localeCompare(right.id));
  for (const match of ordered) {
    const home = ratings.get(match.homeTeamId) ?? initialRating;
    const away = ratings.get(match.awayTeamId) ?? initialRating;
    const expectedHome = 1 / (1 + 10 ** ((away - (home + homeAdvantage)) / 400));
    const actualHome = match.homeScore === match.awayScore ? 0.5 : match.homeScore > match.awayScore ? 1 : 0;
    ratings.set(match.homeTeamId, round(home + kFactor * (actualHome - expectedHome)));
    ratings.set(match.awayTeamId, round(away + kFactor * ((1 - actualHome) - (1 - expectedHome))));
  }
  return ratings;
}

export function calculatePlayerSeasonMetrics(seasonId: string, performances: PlayerMatchPerformance[]): PlayerSeasonMetrics[] {
  const grouped = new Map<string, PlayerMatchPerformance[]>();
  for (const performance of performances) {
    const list = grouped.get(performance.playerId) ?? [];
    list.push(performance);
    grouped.set(performance.playerId, list);
  }
  return [...grouped.entries()].map(([playerId, rows]) => {
    const minutes = rows.reduce((sum, row) => sum + (row.minutes ?? 0), 0);
    const goals = rows.reduce((sum, row) => sum + (row.goals ?? 0), 0);
    const assists = rows.reduce((sum, row) => sum + (row.assists ?? 0), 0);
    const xgValues = rows.map((row) => row.xg).filter((value): value is number => value !== null);
    const xaValues = rows.map((row) => row.xa).filter((value): value is number => value !== null);
    const per90 = (value: number) => minutes > 0 ? round(value * 90 / minutes) : null;
    const matchScores = rows.map((row) => (row.goals ?? 0) * 4 + (row.assists ?? 0) * 3 + (row.xg ?? 0));
    return {
      seasonId,
      playerId,
      matches: rows.length,
      starts: null,
      minutes,
      goals,
      assists,
      xg: xgValues.length > 0 ? round(xgValues.reduce((sum, value) => sum + value, 0)) : null,
      xa: xaValues.length > 0 ? round(xaValues.reduce((sum, value) => sum + value, 0)) : null,
      goalsPer90: per90(goals),
      assistsPer90: per90(assists),
      performanceScore: matchScores.length > 0 ? round(matchScores.reduce((sum, value) => sum + value, 0) / matchScores.length) : null,
      consistency: calculateNumberConsistency(matchScores),
      methodologyVersion: ANALYTICS_METHODOLOGY_VERSION,
    };
  });
}

function resultFor(match: CompletedMatch, teamId: string, opponentId: string, venue: "HOME" | "AWAY", goalsFor: number, goalsAgainst: number): TeamMatchResult {
  return {
    matchId: match.id,
    teamId,
    opponentId,
    kickoffAt: match.kickoffAt,
    venue,
    goalsFor,
    goalsAgainst,
    points: goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0,
    result: goalsFor > goalsAgainst ? "W" : goalsFor === goalsAgainst ? "D" : "L",
  };
}

function splitMetrics(results: TeamMatchResult[]): SplitMetrics {
  return {
    matches: results.length,
    wins: results.filter((result) => result.result === "W").length,
    draws: results.filter((result) => result.result === "D").length,
    losses: results.filter((result) => result.result === "L").length,
    goalsFor: results.reduce((sum, result) => sum + result.goalsFor, 0),
    goalsAgainst: results.reduce((sum, result) => sum + result.goalsAgainst, 0),
    points: results.reduce((sum, result) => sum + result.points, 0),
    pointsPerMatch: ratio(results.reduce((sum, result) => sum + result.points, 0), results.length),
  };
}

function calculateMomentum(results: TeamMatchResult[]): number | null {
  if (results.length < 6) return null;
  const previous = results.slice(-10, -5);
  const recent = results.slice(-5);
  return round((recent.reduce((sum, result) => sum + result.points, 0) / recent.length) - (previous.reduce((sum, result) => sum + result.points, 0) / previous.length));
}

function calculateConsistency(results: TeamMatchResult[]): number | null {
  return calculateNumberConsistency(results.map((result) => result.points));
}

function calculateNumberConsistency(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return round(1 / (1 + Math.sqrt(variance)), 4);
}

function leagueAverage(matches: CompletedMatch[]): number | null {
  if (matches.length === 0) return null;
  return (matches.reduce((sum, match) => sum + match.homeScore + match.awayScore, 0) / matches.length) / 2;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round(numerator / denominator) : null;
}

function dateValue(date: Date | null): number {
  return date?.getTime() ?? Number.MAX_SAFE_INTEGER;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

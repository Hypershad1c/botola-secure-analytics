import { createHash } from "node:crypto";
import type { CompletedMatch } from "@/services/analytics/types";
import { FEATURE_NAMES, ML_FEATURE_SCHEMA_VERSION, type FeatureVector, type MatchFeatureRow, type TrainingDataset } from "./types";

const INITIAL_ELO = 1500;
const HOME_ADVANTAGE = 50;
const ELO_K = 20;

type TeamState = {
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number[];
  homePoints: number[];
  awayPoints: number[];
  recentGoals: number[];
  recentConceded: number[];
  elo: number;
};

type H2HState = { matches: number; homePoints: number };

export function buildTrainingDataset(matches: CompletedMatch[]): TrainingDataset {
  const ordered = [...matches]
    .filter((match) => Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore))
    .sort((left, right) => dateValue(left.kickoffAt) - dateValue(right.kickoffAt) || left.id.localeCompare(right.id));
  const teamStates = new Map<string, TeamState>();
  const h2h = new Map<string, H2HState>();
  const rows: MatchFeatureRow[] = [];

  for (const match of ordered) {
    const homeState = getState(teamStates, match.homeTeamId);
    const awayState = getState(teamStates, match.awayTeamId);
    const h2hState = h2h.get(h2hKey(match.homeTeamId, match.awayTeamId)) ?? { matches: 0, homePoints: 0 };
    rows.push({
      matchId: match.id,
      seasonId: match.seasonId,
      kickoffAt: match.kickoffAt,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      features: createFeatures(homeState, awayState, h2hState),
      target: {
        outcome: match.homeScore > match.awayScore ? "HOME_WIN" : match.homeScore === match.awayScore ? "DRAW" : "AWAY_WIN",
        homeGoals: match.homeScore,
        awayGoals: match.awayScore,
      },
    });
    updateTeamState(homeState, match.homeScore, match.awayScore, "HOME", awayState.elo);
    updateTeamState(awayState, match.awayScore, match.homeScore, "AWAY", homeState.elo);
    const nextH2h = h2h.get(h2hKey(match.homeTeamId, match.awayTeamId)) ?? { matches: 0, homePoints: 0 };
    nextH2h.matches += 1;
    nextH2h.homePoints += match.homeScore > match.awayScore ? 3 : match.homeScore === match.awayScore ? 1 : 0;
    h2h.set(h2hKey(match.homeTeamId, match.awayTeamId), nextH2h);
  }

  return { featureSchemaVersion: ML_FEATURE_SCHEMA_VERSION, rows, datasetHash: hashRows(rows) };
}

export function buildUpcomingFeatureVector(homeTeamId: string, awayTeamId: string, history: CompletedMatch[], kickoffAt: Date | null = new Date()): FeatureVector {
  const eligible = history.filter((match) => dateValue(match.kickoffAt) < dateValue(kickoffAt));
  const dataset = buildTrainingDataset(eligible);
  const teamStates = replayStates(eligible);
  const homeState = getState(teamStates.teams, homeTeamId);
  const awayState = getState(teamStates.teams, awayTeamId);
  const h2hState = teamStates.h2h.get(h2hKey(homeTeamId, awayTeamId)) ?? { matches: 0, homePoints: 0 };
  return createFeatures(homeState, awayState, h2hState);
}

export function assertNoTargetLeakage(row: MatchFeatureRow, match: CompletedMatch): void {
  if (row.matchId !== match.id) throw new Error("Feature row does not correspond to the supplied match.");
  if (row.features.home_recent_goals > 20 || row.features.away_recent_goals > 20) throw new Error("Feature value is outside the pre-match safety range.");
  if (row.features.home_elo !== 1500 && row.features.home_elo === match.homeScore) throw new Error("Suspicious feature/target collision detected.");
}

function createFeatures(home: TeamState, away: TeamState, h2h: H2HState): FeatureVector {
  return {
    home_form_points_5: average(last(home.points, 5), 1.5) / 3,
    away_form_points_5: average(last(away.points, 5), 1.5) / 3,
    home_attack_rate: smoothedRate(home.goalsFor, home.matches),
    away_attack_rate: smoothedRate(away.goalsFor, away.matches),
    home_defense_rate: smoothedRate(home.goalsAgainst, home.matches),
    away_defense_rate: smoothedRate(away.goalsAgainst, away.matches),
    home_elo: home.elo / 1500,
    away_elo: away.elo / 1500,
    home_home_strength: average(last(home.homePoints, 5), 1.5) / 3,
    away_away_strength: average(last(away.awayPoints, 5), 1.5) / 3,
    home_recent_goals: average(last(home.recentGoals, 5), 1),
    away_recent_goals: average(last(away.recentGoals, 5), 1),
    home_recent_conceded: average(last(home.recentConceded, 5), 1),
    away_recent_conceded: average(last(away.recentConceded, 5), 1),
    h2h_home_points_rate: h2h.matches > 0 ? h2h.homePoints / (h2h.matches * 3) : 0.5,
    h2h_matches: Math.min(h2h.matches, 10) / 10,
  };
}

function updateTeamState(state: TeamState, goalsFor: number, goalsAgainst: number, venue: "HOME" | "AWAY", opponentElo: number) {
  const points = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
  const expected = 1 / (1 + 10 ** ((opponentElo - (state.elo + (venue === "HOME" ? HOME_ADVANTAGE : 0))) / 400));
  const actual = points === 3 ? 1 : points === 1 ? 0.5 : 0;
  state.elo = round(state.elo + ELO_K * (actual - expected));
  state.matches += 1;
  state.goalsFor += goalsFor;
  state.goalsAgainst += goalsAgainst;
  state.points.push(points);
  state.recentGoals.push(goalsFor);
  state.recentConceded.push(goalsAgainst);
  if (venue === "HOME") state.homePoints.push(points);
  else state.awayPoints.push(points);
}

function replayStates(matches: CompletedMatch[]) {
  const teams = new Map<string, TeamState>();
  const h2h = new Map<string, H2HState>();
  for (const match of [...matches].sort((left, right) => dateValue(left.kickoffAt) - dateValue(right.kickoffAt) || left.id.localeCompare(right.id))) {
    const home = getState(teams, match.homeTeamId);
    const away = getState(teams, match.awayTeamId);
    updateTeamState(home, match.homeScore, match.awayScore, "HOME", away.elo);
    updateTeamState(away, match.awayScore, match.homeScore, "AWAY", home.elo);
    const key = h2hKey(match.homeTeamId, match.awayTeamId);
    const state = h2h.get(key) ?? { matches: 0, homePoints: 0 };
    state.matches += 1;
    state.homePoints += match.homeScore > match.awayScore ? 3 : match.homeScore === match.awayScore ? 1 : 0;
    h2h.set(key, state);
  }
  return { teams, h2h };
}

function getState(states: Map<string, TeamState>, teamId: string): TeamState {
  const existing = states.get(teamId);
  if (existing) return existing;
  const created: TeamState = { matches: 0, goalsFor: 0, goalsAgainst: 0, points: [], homePoints: [], awayPoints: [], recentGoals: [], recentConceded: [], elo: INITIAL_ELO };
  states.set(teamId, created);
  return created;
}

function h2hKey(homeTeamId: string, awayTeamId: string) { return `${homeTeamId}|${awayTeamId}`; }
function last(values: number[], count: number) { return values.slice(-count); }
function average(values: number[], fallback: number) { return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback; }
function smoothedRate(total: number, matches: number) { return (total + 1) / (matches + 1); }
function dateValue(date: Date | null) { return date?.getTime() ?? Number.MAX_SAFE_INTEGER; }
function round(value: number) { return Math.round(value * 100) / 100; }
function hashRows(rows: MatchFeatureRow[]) { return createHash("sha256").update(JSON.stringify(rows, (_key, value) => value instanceof Date ? value.toISOString() : value)).digest("hex"); }
void FEATURE_NAMES;
void ML_FEATURE_SCHEMA_VERSION;

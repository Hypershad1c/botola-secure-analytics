import { z } from "zod";
import { runMatchRecordsPipeline, type PipelineOptions, type PipelineResult } from "./pipeline";
import type { SourceRecord } from "./types";

const responseSchema = z.object({
  groups: z.array(z.object({
    id: z.string(),
    label: z.string().optional(),
    matches: z.array(z.object({
      id: z.string().min(1),
      href: z.string().optional(),
      competitionName: z.string().optional(),
      home: z.object({ name: z.string().min(1), logoUrl: z.string().optional() }),
      away: z.object({ name: z.string().min(1), logoUrl: z.string().optional() }),
      center: z.object({ home: z.union([z.number(), z.string()]).nullable().optional(), away: z.union([z.number(), z.string()]).nullable().optional(), dateLabel: z.string().min(1), live: z.boolean().optional() }),
    })),
  })),
});

export type ElbotolaMatch = {
  id: string;
  week: number;
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  href?: string;
};

export type ElbotolaFetchResult = {
  seasonId: string;
  matches: ElbotolaMatch[];
  responses: Array<{ week: number; url: string; body: unknown }>;
};

export type ElbotolaFetchOptions = {
  seasonId: string;
  locale?: string;
  maxWeeks?: number;
  delayMs?: number;
  fetchImpl?: typeof fetch;
};

export async function fetchElbotolaSeasonMatches(options: ElbotolaFetchOptions): Promise<ElbotolaFetchResult> {
  const locale = options.locale ?? "en";
  const maxWeeks = Math.min(Math.max(options.maxWeeks ?? 30, 1), 60);
  const delayMs = Math.max(options.delayMs ?? 750, 250);
  const fetchImpl = options.fetchImpl ?? fetch;
  const matches = new Map<string, ElbotolaMatch>();
  const responses: ElbotolaFetchResult["responses"] = [];
  let emptyWeeks = 0;

  for (let week = 1; week <= maxWeeks; week += 1) {
    const url = `https://m.elbotola.com/api/analytics/season/${encodeURIComponent(options.seasonId)}/matches?locale=${encodeURIComponent(locale)}&week=${week}`;
    const response = await fetchImpl(url, { headers: { accept: "application/json", "user-agent": "BotolaSecureAnalytics/1.0 (public-data-import)" } });
    if (!response.ok) throw new Error(`Elbotola week ${week} returned HTTP ${response.status}.`);
    const raw = await response.json();
    const parsed = responseSchema.parse(raw);
    responses.push({ week, url, body: parsed });
    const weekMatches = parsed.groups.flatMap((group) => group.matches.map((match) => mapMatch(match, week)));
    if (weekMatches.length === 0) emptyWeeks += 1;
    else emptyWeeks = 0;
    for (const match of weekMatches) matches.set(match.id, match);
    if (emptyWeeks >= 2 && week >= 10) break;
    if (week < maxWeeks) await sleep(delayMs);
  }
  if (matches.size === 0) throw new Error(`No public Elbotola matches were found for season ${options.seasonId}.`);
  return { seasonId: options.seasonId, matches: [...matches.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)), responses };
}

export function runElbotolaPipeline(result: ElbotolaFetchResult, options: Omit<PipelineOptions, "contentType"> & { contentType?: string }): PipelineResult {
  const sourceRecords: SourceRecord[] = result.matches.map((match, index) => ({
    sourceCode: options.sourceCode,
    datasetName: options.datasetName,
    datasetVersion: options.datasetVersion,
    sourceRecordId: match.id,
    rowNumber: index + 1,
    payload: {
      id: match.id,
      competition: match.competition,
      season: options.datasetVersion ?? "",
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      date: match.date,
      home_score: match.homeScore === null ? "" : String(match.homeScore),
      away_score: match.awayScore === null ? "" : String(match.awayScore),
      source_match_url: match.href ? `https://m.elbotola.com${match.href}` : "",
    },
  }));
  const artifact = Buffer.from(JSON.stringify({ seasonId: result.seasonId, responses: result.responses }, null, 2), "utf8");
  return runMatchRecordsPipeline(sourceRecords, artifact, { ...options, contentType: options.contentType ?? "application/json" });
}

function mapMatch(match: z.infer<typeof responseSchema>["groups"][number]["matches"][number], week: number): ElbotolaMatch {
  return {
    id: match.id,
    week,
    date: parseDateLabel(match.center.dateLabel),
    competition: match.competitionName ?? "Morocco Botola 2",
    homeTeam: match.home.name,
    awayTeam: match.away.name,
    homeScore: scoreValue(match.center.home),
    awayScore: scoreValue(match.center.away),
    href: match.href,
  };
}

function scoreValue(value: number | string | null | undefined): number | null {
  if (value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 ? score : null;
}

function parseDateLabel(value: string): string {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) throw new Error(`Unsupported Elbotola date label: ${value}`);
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid Elbotola date label: ${value}`);
  return date.toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

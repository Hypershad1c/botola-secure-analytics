import type { NormalizedMatch, SourceRecord } from "./types";
import { matchFingerprint } from "./normalizer";
import { runMatchRecordsPipeline, type PipelineOptions, type PipelineResult } from "./pipeline";

export type OpenfootballParseResult = {
  records: SourceRecord[];
  sourceSeason: string;
  competition: string;
};

const seasonHeader = /^=\s+Morocco\s+\|\s+(.+?)\s+(\d{4}\/\d{2})\s*$/;
const dateLine = /^\s{2}(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/;
const matchLine = /^\s+(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)\s*-\s*(\d+)(?:\s+\((\d+)\s*-\s*(\d+)\))?\s*$/;

export function parseOpenfootballText(text: string, sourceCode = "openfootball-world"): OpenfootballParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const header = lines.map((line) => line.match(seasonHeader)).find(Boolean);
  if (!header) throw new Error("Openfootball source header was not found.");
  const competition = normalizeCompetition(header[1] ?? "Botola Pro");
  const sourceSeason = header[2] ?? "";
  const startYear = Number(sourceSeason.slice(0, 4));
  let currentDate: Date | null = null;
  let currentMonth = -1;
  const records: SourceRecord[] = [];
  let ordinal = 0;

  lines.forEach((line, index) => {
    const parsedDate = line.match(dateLine);
    if (parsedDate) {
      const month = monthNumber(parsedDate[1] ?? "");
      let year = parsedDate[3] ? Number(parsedDate[3]) : startYear;
      if (!parsedDate[3] && currentMonth >= 0 && month < currentMonth) year += 1;
      currentMonth = month;
      currentDate = new Date(Date.UTC(year, month, Number(parsedDate[2]), 12, 0, 0));
      return;
    }
    const parsedMatch = line.match(matchLine);
    if (!parsedMatch || !currentDate) return;
    const kickoff = new Date(currentDate);
    if (parsedMatch[1]) {
      const [hours, minutes] = parsedMatch[1].split(":").map(Number);
      kickoff.setUTCHours(hours ?? 12, minutes ?? 0, 0, 0);
    }
    const homeTeam = cleanTeam(parsedMatch[2] ?? "");
    const awayTeam = cleanTeam(parsedMatch[3] ?? "");
    const homeScore = Number(parsedMatch[4]);
    const awayScore = Number(parsedMatch[5]);
    const sourceRecordId = `${sourceCode}:${sourceSeason}:${ordinal + 1}`;
    const payload: Record<string, string> = {
      id: sourceRecordId,
      competition,
      season: sourceSeason,
      home_team: homeTeam,
      away_team: awayTeam,
      date: kickoff.toISOString(),
      home_score: String(homeScore),
      away_score: String(awayScore),
    };
    records.push({ sourceCode, datasetName: `openfootball-${sourceSeason}`, datasetVersion: sourceSeason, sourceRecordId, rowNumber: index + 1, payload });
    ordinal += 1;
  });
  if (records.length === 0) throw new Error("No completed match records were found in the openfootball source.");
  return { records, sourceSeason, competition };
}

export function runOpenfootballPipeline(content: Buffer | string, options: Omit<PipelineOptions, "contentType"> & { contentType?: string }): PipelineResult {
  const body = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  const parsed = parseOpenfootballText(body.toString("utf8"), options.sourceCode);
  return runMatchRecordsPipeline(parsed.records, body, { ...options, contentType: options.contentType ?? "text/plain; charset=utf-8" });
}

function cleanTeam(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCompetition(value: string): string {
  return value.replace(/\s+1$/, "").trim();
}

function monthNumber(value: string): number {
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(value);
  if (month < 0) throw new Error(`Unknown month in openfootball source: ${value}`);
  return month;
}

export function openfootballFingerprint(record: NormalizedMatch): string {
  return matchFingerprint({ competition: record.competition, season: record.season, homeTeam: record.homeTeam, awayTeam: record.awayTeam, date: record.date });
}

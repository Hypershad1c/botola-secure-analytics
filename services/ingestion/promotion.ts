import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeName } from "./normalizer";
import type { NormalizedMatch } from "./types";

type PromotionOptions = {
  countryCode?: string;
  competitionType?: "LEAGUE" | "CUP" | "SUPER_CUP" | "FRIENDLY" | "OTHER";
};

export type PromotionResult = {
  ingestionRunId: string;
  promotedMatches: number;
  seasonIds: string[];
  matchIds: string[];
};

export async function promoteAcceptedMatches(db: PrismaClient, ingestionRunId: string, options: PromotionOptions = {}): Promise<PromotionResult> {
  const countryCode = options.countryCode ?? "MA";
  const competitionType = options.competitionType ?? "LEAGUE";
  return db.$transaction(async (tx) => {
    const run = await tx.ingestionRun.findUniqueOrThrow({ where: { id: ingestionRunId }, include: { source: true, records: { where: { entityType: "match", status: "ACCEPTED" }, orderBy: { rowNumber: "asc" } } } });
    const seasonIds = new Set<string>();
    const matchIds: string[] = [];
    for (const staged of run.records) {
      const normalized = readNormalizedMatch(staged.normalized ?? staged.payload);
      const competitionName = displayName(normalized.competition);
      const seasonName = normalized.season.trim();
      const competition = await tx.competition.upsert({ where: { canonicalName: competitionName }, update: { competitionType, countryCode }, create: { canonicalName: competitionName, competitionType, countryCode } });
      const season = await tx.season.upsert({ where: { competitionId_name: { competitionId: competition.id, name: seasonName } }, update: {}, create: { competitionId: competition.id, name: seasonName } });
      seasonIds.add(season.id);
      const homeTeam = await upsertTeam(tx, normalized.homeTeam, countryCode, run.source.id);
      const awayTeam = await upsertTeam(tx, normalized.awayTeam, countryCode, run.source.id);
      const externalKey = `${run.source.code}:${normalized.sourceRecordId ?? normalized.fingerprint}`;
      const match = await tx.match.upsert({
        where: { externalKey },
        update: { competitionId: competition.id, seasonId: season.id, kickoffAt: normalized.date ? new Date(normalized.date) : null, status: normalized.homeScore !== null && normalized.awayScore !== null ? "COMPLETED" : "SCHEDULED", homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, homeScore: normalized.homeScore, awayScore: normalized.awayScore },
        create: { externalKey, competitionId: competition.id, seasonId: season.id, kickoffAt: normalized.date ? new Date(normalized.date) : null, status: normalized.homeScore !== null && normalized.awayScore !== null ? "COMPLETED" : "SCHEDULED", homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, homeScore: normalized.homeScore, awayScore: normalized.awayScore },
      });
      await tx.stagedRecord.update({ where: { id: staged.id }, data: { canonicalId: match.id } });
      matchIds.push(match.id);
    }
    return { ingestionRunId, promotedMatches: matchIds.length, seasonIds: [...seasonIds], matchIds };
  });
}

async function upsertTeam(tx: Prisma.TransactionClient, normalizedName: string, countryCode: string, sourceId: string) {
  const canonicalName = displayName(normalizedName);
  const team = await tx.team.upsert({ where: { canonicalName_countryCode: { canonicalName, countryCode } }, update: {}, create: { canonicalName, shortName: makeShortName(canonicalName), countryCode } });
  await tx.entityAlias.upsert({ where: { entityType_normalizedKey_sourceId: { entityType: "team", normalizedKey: normalizeName(normalizedName), sourceId } }, update: { teamId: team.id, displayValue: canonicalName }, create: { entityType: "team", normalizedKey: normalizeName(normalizedName), displayValue: canonicalName, sourceId, teamId: team.id } });
  return team;
}

function readNormalizedMatch(value: unknown): NormalizedMatch {
  if (!value || typeof value !== "object") throw new Error("Staged match has no normalized object.");
  const record = value as Partial<NormalizedMatch>;
  if (record.entityType !== "match" || typeof record.competition !== "string" || typeof record.season !== "string" || typeof record.homeTeam !== "string" || typeof record.awayTeam !== "string" || typeof record.fingerprint !== "string") throw new Error("Staged match does not satisfy the normalized match contract.");
  return record as NormalizedMatch;
}

function displayName(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function makeShortName(value: string): string | undefined {
  const initials = value.split(/\s+/).map((part) => part[0]).join("").toUpperCase();
  return initials.length >= 2 && initials.length <= 8 ? initials : undefined;
}

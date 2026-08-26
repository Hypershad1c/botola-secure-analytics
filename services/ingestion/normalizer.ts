export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

const teamAliases: Record<string, string> = {
  "raja ca": "raja casablanca",
  "raja club athletic": "raja casablanca",
  "wydad ac": "wydad casablanca",
  "wydad athletic club": "wydad casablanca",
};

export function canonicalTeamName(value: string): string {
  const normalized = normalizeName(value);
  return teamAliases[normalized] ?? normalized;
}

export function matchFingerprint(input: {
  competition: string;
  season: string;
  homeTeam: string;
  awayTeam: string;
  date?: string | null;
}): string {
  const date = input.date ? input.date.slice(0, 10) : "unknown-date";
  return [normalizeName(input.competition), input.season.trim(), canonicalTeamName(input.homeTeam), canonicalTeamName(input.awayTeam), date]
    .join("|");
}

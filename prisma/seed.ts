import { PrismaClient, SourceKind } from "@prisma/client";

const db = new PrismaClient();

const permissions = [
  ["football.read", "Read canonical football data"],
  ["football.import", "Run football data imports"],
  ["football.jobs", "Queue football ingestion and ML jobs"],
  ["security.read", "Read security events and alerts"],
  ["admin.manage_users", "Manage users and roles"],
] as const;

const roles = [
  ["SUPER_ADMIN", "Full administrative access"],
  ["DATA_ADMIN", "Manage data sources and imports"],
  ["ANALYST", "Read football data"],
  ["SECURITY_ANALYST", "Read security telemetry"],
] as const;

async function main() {
  const permissionRows = new Map<string, string>();
  for (const [key, description] of permissions) {
    const permission = await db.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
    permissionRows.set(key, permission.id);
  }

  for (const [name, description] of roles) {
    const role = await db.role.upsert({ where: { name }, update: { description }, create: { name, description } });
    if (name === "SUPER_ADMIN") {
      for (const permissionId of permissionRows.values()) {
        await db.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId } }, update: { effect: "ALLOW" }, create: { roleId: role.id, permissionId, effect: "ALLOW" } });
      }
    }
  }

  const sources = [
    { code: "footystats-dataset", name: "FootyStats historical datasets", kind: SourceKind.FOOTYSTATS_DATASET, priority: 10 },
    { code: "footystats-api", name: "FootyStats API", kind: SourceKind.FOOTYSTATS_API, priority: 20 },
    { code: "api-football", name: "API-Football", kind: SourceKind.API_FOOTBALL, priority: 30 },
    { code: "openfootball-world", name: "openfootball public-domain results", kind: SourceKind.SYSTEM, priority: 35 },
    { code: "elbotola-public", name: "Elbotola public match pages", kind: SourceKind.SYSTEM, priority: 36 },
    { code: "manual", name: "Manual correction", kind: SourceKind.MANUAL, priority: 40 },
  ];
  for (const source of sources) {
    await db.dataSource.upsert({ where: { code: source.code }, update: source, create: source });
  }

  if (process.env.SEED_DEMO_DATA === "true") await seedDevelopmentFootballData();
}

async function seedDevelopmentFootballData() {
  const competition = await db.competition.upsert({
    where: { canonicalName: "Botola Pro" },
    update: { countryCode: "MA", competitionType: "LEAGUE" },
    create: { canonicalName: "Botola Pro", countryCode: "MA", competitionType: "LEAGUE" },
  });
  const season = await db.season.upsert({
    where: { competitionId_name: { competitionId: competition.id, name: "2024/25 Development Fixture" } },
    update: { isCurrent: true, startDate: new Date("2024-08-01"), endDate: new Date("2025-05-31") },
    create: { competitionId: competition.id, name: "2024/25 Development Fixture", isCurrent: true, startDate: new Date("2024-08-01"), endDate: new Date("2025-05-31") },
  });
  await db.season.updateMany({ where: { competitionId: competition.id, id: { not: season.id } }, data: { isCurrent: false } });

  const teams = [
    { id: "00000000-0000-4000-8000-000000000201", canonicalName: "Raja Casablanca", shortName: "RCA", countryCode: "MA" },
    { id: "00000000-0000-4000-8000-000000000202", canonicalName: "Wydad Casablanca", shortName: "WAC", countryCode: "MA" },
    { id: "00000000-0000-4000-8000-000000000203", canonicalName: "AS FAR Rabat", shortName: "FAR", countryCode: "MA" },
    { id: "00000000-0000-4000-8000-000000000204", canonicalName: "FUS Rabat", shortName: "FUS", countryCode: "MA" },
  ];
  for (const team of teams) await db.team.upsert({ where: { id: team.id }, update: team, create: team });

  const matches = [
    ["00000000-0000-4000-8000-000000000301", "2024-08-16T19:00:00Z", teams[0].id, teams[1].id, 2, 1],
    ["00000000-0000-4000-8000-000000000302", "2024-08-17T19:00:00Z", teams[2].id, teams[3].id, 1, 1],
    ["00000000-0000-4000-8000-000000000303", "2024-08-23T19:00:00Z", teams[1].id, teams[2].id, 0, 2],
    ["00000000-0000-4000-8000-000000000304", "2024-08-24T19:00:00Z", teams[3].id, teams[0].id, 1, 3],
    ["00000000-0000-4000-8000-000000000305", "2024-08-30T19:00:00Z", teams[0].id, teams[2].id, 1, 1],
    ["00000000-0000-4000-8000-000000000306", "2024-08-31T19:00:00Z", teams[1].id, teams[3].id, 2, 0],
    ["00000000-0000-4000-8000-000000000307", "2024-09-06T19:00:00Z", teams[3].id, teams[2].id, 0, 1],
    ["00000000-0000-4000-8000-000000000308", "2024-09-07T19:00:00Z", teams[1].id, teams[0].id, 1, 1],
    ["00000000-0000-4000-8000-000000000309", "2024-09-13T19:00:00Z", teams[2].id, teams[1].id, 2, 1],
    ["00000000-0000-4000-8000-000000000310", "2024-09-14T19:00:00Z", teams[0].id, teams[3].id, 2, 0],
    ["00000000-0000-4000-8000-000000000311", "2024-09-20T19:00:00Z", teams[2].id, teams[0].id, 0, 1],
    ["00000000-0000-4000-8000-000000000312", "2024-09-21T19:00:00Z", teams[3].id, teams[1].id, 1, 2],
  ] as const;
  for (const [id, kickoffAt, homeTeamId, awayTeamId, homeScore, awayScore] of matches) {
    await db.match.upsert({
      where: { id },
      update: { competitionId: competition.id, seasonId: season.id, kickoffAt: new Date(kickoffAt), status: "COMPLETED", homeTeamId, awayTeamId, homeScore, awayScore, externalKey: `dev-${id.slice(-3)}` },
      create: { id, competitionId: competition.id, seasonId: season.id, kickoffAt: new Date(kickoffAt), status: "COMPLETED", homeTeamId, awayTeamId, homeScore, awayScore, externalKey: `dev-${id.slice(-3)}` },
    });
  }
  console.log(`Seeded development football data: season=${season.id}, matches=${matches.length}, teams=${teams.length}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());

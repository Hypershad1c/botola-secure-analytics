import { PrismaClient, SourceKind } from "@prisma/client";

const db = new PrismaClient();

const permissions = [
  ["football.read", "Read canonical football data"],
  ["football.import", "Run football data imports"],
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
    { code: "manual", name: "Manual correction", kind: SourceKind.MANUAL, priority: 40 },
  ];
  for (const source of sources) {
    await db.dataSource.upsert({ where: { code: source.code }, update: source, create: source });
  }
}

main().finally(() => db.$disconnect());

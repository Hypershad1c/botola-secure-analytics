import { db } from "@/lib/db";
import { createDefaultWorkerHandlers } from "@/services/jobs/default-handlers";
import { runWorkerOnce } from "@/services/jobs/worker";

async function main() {
  const result = await runWorkerOnce(db, createDefaultWorkerHandlers(db));
  console.log(JSON.stringify(result));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());

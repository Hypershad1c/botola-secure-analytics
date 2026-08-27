import { createHash } from "node:crypto";

export function safeArtifactKey(sourceCode: string, datasetName: string, sha256: string): string {
  const safeSource = sourceCode.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  const safeDataset = datasetName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Artifact key requires a lowercase SHA-256 checksum.");
  return `ingestion/${safeSource || "unknown"}/${safeDataset || "dataset"}/${sha256}.raw`;
}

export function hashSensitiveValue(value: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

export function redactHeaders(headers: Headers): Record<string, string> {
  const redacted = new Set(["authorization", "cookie", "set-cookie", "x-api-key"]);
  return Object.fromEntries([...headers.entries()].map(([key, value]) => [key, redacted.has(key.toLowerCase()) ? "[REDACTED]" : value]));
}

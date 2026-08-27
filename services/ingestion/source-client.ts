import { createHash } from "node:crypto";

export type SourceClientOptions = {
  allowedHosts: string[];
  maxBytes?: number;
  timeoutMs?: number;
};

export type DownloadedArtifact = {
  url: string;
  contentType: string;
  byteSize: number;
  sha256: string;
  body: Buffer;
};

export class SourceClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceClientError";
  }
}

export async function downloadSourceArtifact(
  url: string,
  options: SourceClientOptions,
): Promise<DownloadedArtifact> {
  const parsed = new URL(url);
  const maxBytes = options.maxBytes ?? 15 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 20_000;
  if (parsed.protocol !== "https:") throw new SourceClientError("Only HTTPS source URLs are allowed.");
  if (!options.allowedHosts.includes(parsed.hostname)) {
    throw new SourceClientError(`Source host is not allowlisted: ${parsed.hostname}`);
  }
  if (parsed.username || parsed.password) throw new SourceClientError("Credential-bearing URLs are not allowed.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(parsed, { redirect: "error", signal: controller.signal, headers: { Accept: "text/csv, application/json" } });
    if (!response.ok) throw new SourceClientError(`Source returned HTTP ${response.status}.`);
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > maxBytes) throw new SourceClientError("Source artifact exceeds the byte limit.");
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > maxBytes) throw new SourceClientError("Source artifact exceeds the byte limit.");
    return {
      url: parsed.toString(),
      contentType: response.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream",
      byteSize: body.byteLength,
      sha256: createHash("sha256").update(body).digest("hex"),
      body,
    };
  } catch (error) {
    if (error instanceof SourceClientError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new SourceClientError("Source request timed out.");
    throw new SourceClientError("Source request failed safely.");
  } finally {
    clearTimeout(timeout);
  }
}

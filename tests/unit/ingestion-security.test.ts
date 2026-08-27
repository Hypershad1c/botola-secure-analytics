import { describe, expect, it } from "vitest";
import { hashSensitiveValue, redactHeaders, safeArtifactKey } from "@/services/ingestion/security";

describe("ingestion security helpers", () => {
  it("creates a traversal-safe artifact key", () => {
    expect(safeArtifactKey("FootyStats/API", "Botola 2024/25", "a".repeat(64))).toBe(
      `ingestion/footystats-api/botola-2024-25/${"a".repeat(64)}.raw`,
    );
  });

  it("rejects malformed artifact checksums", () => {
    expect(() => safeArtifactKey("source", "dataset", "not-a-hash")).toThrow();
  });

  it("redacts credential-bearing headers", () => {
    const headers = new Headers({ authorization: "Bearer secret", cookie: "session=secret", accept: "text/csv" });
    expect(redactHeaders(headers)).toEqual({ accept: "text/csv", authorization: "[REDACTED]", cookie: "[REDACTED]" });
  });

  it("hashes a sensitive value deterministically without returning the input", () => {
    const result = hashSensitiveValue("192.0.2.1", "test-secret");
    expect(result).toHaveLength(64);
    expect(result).not.toContain("192.0.2.1");
    expect(hashSensitiveValue("192.0.2.1", "test-secret")).toBe(result);
  });
});

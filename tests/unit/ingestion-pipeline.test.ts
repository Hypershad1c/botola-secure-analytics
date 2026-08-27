import { describe, expect, it } from "vitest";
import { CsvSecurityError, parseCsv } from "@/services/ingestion/csv";
import { runMatchCsvPipeline } from "@/services/ingestion/pipeline";
import { renderIngestionReport } from "@/services/ingestion/report";

const csv = `id,competition,season,home_team,away_team,date,home_score,away_score
m-001,Botola Pro,2024/25,Raja CA,Wydad AC,2024-10-01T20:00:00Z,1,0
m-002,Botola Pro,2024/25,Wydad Casablanca,Raja Casablanca,2024-10-08T20:00:00Z,2,2
m-003,Botola Pro,2024/25,Raja Club Athletic,Wydad Athletic Club,2024-10-01T20:00:00Z,1,0
m-004,Botola Pro,2024/25,Raja CA,Raja CA,not-a-date,-1,0`;

describe("secure CSV parser", () => {
  it("rejects formula-like cells", () => {
    expect(() => parseCsv("id,team\n1,=HYPERLINK(\"x\")")).toThrow(CsvSecurityError);
  });

  it("rejects duplicate headers", () => {
    expect(() => parseCsv("id,id\n1,2")).toThrow(CsvSecurityError);
  });

  it("enforces the byte limit", () => {
    expect(() => parseCsv("id,team\n1,Raja", { maxBytes: 3 })).toThrow(CsvSecurityError);
  });
});

describe("match ingestion pipeline", () => {
  it("normalizes aliases and records duplicate and rejected rows", () => {
    const result = runMatchCsvPipeline(Buffer.from(csv), {
      sourceCode: "footystats-dataset",
      datasetName: "botola-pro",
      datasetVersion: "2024/25",
    });
    expect(result.report.recordsSeen).toBe(4);
    expect(result.report.recordsAccepted).toBe(2);
    expect(result.report.duplicates).toBe(1);
    expect(result.report.recordsRejected).toBe(1);
    expect(result.report.artifact.sha256).toHaveLength(64);
    expect(result.records[2]?.record.homeTeam).toBe("raja casablanca");
  });

  it("renders an operator report", () => {
    const result = runMatchCsvPipeline(csv, { sourceCode: "fixture", datasetName: "test" });
    const report = renderIngestionReport(result.report);
    expect(report).toContain("Ingestion Report");
    expect(report).toContain("DUPLICATE_SOURCE_RECORD");
  });
});

describe("conflict classification", () => {
  it("flags conflicting scores for the same match fingerprint", () => {
    const result = runMatchCsvPipeline(`id,competition,season,home_team,away_team,date,home_score,away_score\na,Botola Pro,2024/25,Raja CA,Wydad AC,2024-10-01,1,0\nb,Botola Pro,2024/25,Raja Casablanca,Wydad Casablanca,2024-10-01,3,0`, {
      sourceCode: "fixture",
      datasetName: "conflict-test",
    });
    expect(result.report.recordsAccepted).toBe(1);
    expect(result.report.conflicts).toBe(1);
    expect(result.report.issuesByCode.CONFLICTING_DUPLICATE).toBe(1);
    expect(result.records[1]?.status).toBe("CONFLICT");
  });
});

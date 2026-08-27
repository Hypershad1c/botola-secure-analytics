"use client";

import { useEffect, useState } from "react";
import { OperationsShell } from "@/components/layout/OperationsShell";

type QualityPayload = { data: { runs: Array<{ id: string; datasetName: string; datasetVersion: string | null; status: string; recordsSeen: number; recordsAccepted: number; recordsRejected: number; duplicates: number; conflicts: number; createdAt: string; source: { code: string; name: string }; _count: { records: number; conflictRecords: number } }>; conflicts: Array<{ id: string; entityType: string; fieldName: string; status: string; createdAt: string; ingestionRunId: string | null; canonicalId: string | null }> } };

type ErrorPayload = { error?: { message?: string } };

export function DataQualityPage() {
  const [payload, setPayload] = useState<QualityPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/v1/data/quality", { credentials: "include" }).then(async (response) => {
      const body = await response.json() as QualityPayload | ErrorPayload;
      if (!response.ok) throw new Error((body as ErrorPayload).error?.message ?? "Data quality is unavailable.");
      setPayload(body as QualityPayload);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Data quality is unavailable."));
  }, []);
  const runs = payload?.data.runs ?? [];
  return <OperationsShell title="Data quality control" section="Data quality">
    <p className="page-lead">Trace every imported artifact from source run to staged record and canonical promotion. Ambiguous records remain visible for review.</p>
    {error && <div className="error-state compact-state"><div className="error-icon">!</div><div><h2>Quality data unavailable</h2><p>{error}</p></div></div>}
    {!error && !payload && <div className="loading-grid"><div className="skeleton skeleton-panel" /></div>}
    {payload && <>
      <section className="metric-grid"><Metric label="Ingestion runs" value={runs.length} detail="Latest 20 runs" accent="teal" /><Metric label="Accepted records" value={runs.reduce((sum, run) => sum + run.recordsAccepted, 0)} detail="Validated staged records" accent="blue" /><Metric label="Open conflicts" value={payload.data.conflicts.length} detail="Require operator review" accent="amber" /><Metric label="Canonical links" value={runs.reduce((sum, run) => sum + run._count.records - run.recordsRejected, 0)} detail="Promotion coverage proxy" accent="violet" /></section>
      <section className="panel page-panel"><div className="panel-header"><div><h2>Recent ingestion runs</h2><p>Provenance, validation and promotion state</p></div></div><div className="table-wrap"><table><thead><tr><th>Dataset</th><th>Source</th><th>Status</th><th>Seen</th><th>Accepted</th><th>Rejected</th><th>Conflicts</th><th>Created</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td><strong>{run.datasetName}</strong><small className="entity-id">{run.datasetVersion ?? "unversioned"}</small></td><td>{run.source.code}</td><td><span className={`status-badge status-${run.status.toLowerCase()}`}>{run.status}</span></td><td>{run.recordsSeen}</td><td className="positive">{run.recordsAccepted}</td><td className="negative">{run.recordsRejected}</td><td>{run.conflicts}</td><td>{new Date(run.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div></section>
      <section className="panel page-panel"><div className="panel-header"><div><h2>Open conflicts</h2><p>Nothing is silently promoted when identity or values disagree.</p></div></div>{payload.data.conflicts.length === 0 ? <div className="empty-inline">No open conflicts in the latest response.</div> : <div className="table-wrap"><table><thead><tr><th>Entity</th><th>Field</th><th>Status</th><th>Created</th><th>Canonical ID</th></tr></thead><tbody>{payload.data.conflicts.map((conflict) => <tr key={conflict.id}><td>{conflict.entityType}</td><td>{conflict.fieldName}</td><td>{conflict.status}</td><td>{new Date(conflict.createdAt).toLocaleDateString()}</td><td className="entity-id">{conflict.canonicalId ?? "unresolved"}</td></tr>)}</tbody></table></div>}</section>
    </>}
  </OperationsShell>;
}
function Metric({ label, value, detail, accent }: { label: string; value: number; detail: string; accent: string }) { return <article className={`metric-card accent-${accent}`}><div className="metric-label">{label}</div><strong>{value}</strong><span className="metric-detail">{detail}</span></article>; }

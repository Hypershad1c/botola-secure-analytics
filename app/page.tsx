export default function HomePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 40, fontFamily: "system-ui" }}>
      <p style={{ color: "#64748b", fontWeight: 600, letterSpacing: "0.08em" }}>BOTOLA SECURE ANALYTICS V2</p>
      <h1>Foundation online</h1>
      <p>
        Phase 1 establishes the database, provenance, ingestion, security, and deployment
        boundaries. Football analytics and operations modules will be added only after their
        data contracts are implemented.
      </p>
      <p>
        <a href="/api/health">Liveness</a> · <a href="/api/readiness">Readiness</a>
      </p>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useDashboardData } from "./use-dashboard-data";
import { useSeasonOptions } from "./use-season-options";
import type { TeamAnalytics } from "./types";

export function AnalyticsDashboard() {
  const [seasonId, setSeasonId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const { teams, players, meta, loading, error, refresh } = useDashboardData(seasonId);
  const { seasons, loading: seasonsLoading, error: seasonsError } = useSeasonOptions();
  const leader = teams[0];
  const averageElo = useMemo(() => teams.length ? Math.round(teams.reduce((sum, team) => sum + team.elo, 0) / teams.length) : null, [teams]);
  useEffect(() => {
    if (!seasonId && seasons[0]) {
      setSeasonId(seasons[0].id);
      setInputValue(seasons[0].id);
    }
  }, [seasonId, seasons]);

  function submitSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSeasonId(inputValue.trim());
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">B</div>
          <div><strong>BOTOLA</strong><span>SECURE ANALYTICS</span></div>
        </div>
        <div className="sidebar-section-label">Operations</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <a className="nav-item active" href="/"><span className="nav-icon">⌂</span>Overview</a>
          <a className="nav-item" href="/teams"><span className="nav-icon">◈</span>Teams</a>
          <a className="nav-item" href="/compare"><span className="nav-icon">⇄</span>Compare</a>
          <a className="nav-item" href="/players"><span className="nav-icon">◇</span>Players</a>
          <a className="nav-item" href="/predictions"><span className="nav-icon">◌</span>Predictions</a>
          <a className="nav-item" href="/scouting"><span className="nav-icon">◎</span>Scouting</a>
          <a className="nav-item" href="/data"><span className="nav-icon">▦</span>Data quality</a>
          <a className="nav-item" href="/reports"><span className="nav-icon">↗</span>Reports</a>
          <a className="nav-item" href="/security"><span className="nav-icon">⚿</span>Security</a>
          <a className="nav-item" href="/analyst"><span className="nav-icon">✦</span>AI analyst</a>
        </nav>
        <div className="sidebar-footer">
          <div className="status-dot"><i />Data services ready</div>
          <small>Phase 5 dashboard</small>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Analytics overview</strong></div>
          <div className="topbar-actions"><span className="live-chip"><i />Protected workspace</span><button className="avatar" aria-label="Account menu">BA</button></div>
        </header>

        <div className="content-wrap" id="overview">
          <section className="hero-row">
            <div>
              <p className="eyebrow">MOROCCAN FOOTBALL INTELLIGENCE</p>
              <h1>Season command center</h1>
              <p className="hero-copy">A precise view of form, performance, and competitive shape across the selected season.</p>
            </div>
            <form className="season-form" onSubmit={submitSeason}>
              <label htmlFor="seasonId">Season ID</label>
              <div className="season-input-row">
                <select className="season-select" aria-label="Current persisted season" value={seasonId} onChange={(event) => { setSeasonId(event.target.value); setInputValue(event.target.value); }}>
                  <option value="">{seasonsLoading ? "Discovering seasons…" : "Select persisted season"}</option>
                  {seasons.map((season) => <option key={season.id} value={season.id}>{season.competition.canonicalName} · {season.name}</option>)}
                </select>
                <button type="submit">Load season</button>
              </div>
              <div className="season-input-row manual-season-row">
                <input id="seasonId" value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder="Or paste a season UUID" aria-describedby="season-help" />
              </div>
              <span id="season-help">{seasonsError ? "Season discovery is unavailable; paste a UUID or check authentication." : "Analytics are protected and sourced from completed, validated matches."}</span>
            </form>
          </section>

          {loading && <LoadingState />}
          {!loading && !seasonId && <EmptyState onLoad={() => setSeasonId(inputValue.trim())} />}
          {!loading && seasonId && error && <ErrorState error={error} onRetry={refresh} />}
          {!loading && seasonId && !error && teams.length === 0 && <EmptyState onLoad={refresh} loaded />}
          {!loading && seasonId && !error && teams.length > 0 && (
            <>
              <section className="metric-grid" aria-label="Season summary">
                <MetricCard label="Teams tracked" value={teams.length} detail="Validated team profiles" accent="teal" />
                <MetricCard label="Current leader" value={leader ? `${leader.points} pts` : "—"} detail={leader ? `${leader.teamName ?? `Team ${leader.teamId.slice(0, 8)}…`} · ${leader.teamId.slice(0, 8)}…` : "Awaiting data"} accent="amber" />
                <MetricCard label="Mean Elo" value={averageElo ?? "—"} detail="Sequential rating baseline 1500" accent="blue" />
                <MetricCard label="Methodology" value={meta?.methodologyVersion ?? "—"} detail="Versioned calculation contract" accent="violet" compact />
              </section>

              <section className="dashboard-grid">
                <div className="panel standings-panel" id="standings">
                  <PanelHeader title="Competitive table" subtitle="Ranked by points, then goal difference" action="View full table" />
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>#</th><th>Team ID</th><th>Form</th><th>MP</th><th>GD</th><th>Pts</th><th>Elo</th></tr></thead>
                      <tbody>{teams.slice(0, 8).map((team, index) => <TeamRow key={team.teamId} team={team} rank={index + 1} />)}</tbody>
                    </table>
                  </div>
                  {meta?.pagination && <div className="panel-foot">Showing {teams.length} of {meta.pagination.total} teams <span>•</span> {meta.cached ? "served from cache" : "fresh calculation"}</div>}
                </div>

                <div className="panel signal-panel">
                  <PanelHeader title="Performance signals" subtitle="Derived from the selected season" />
                  <div className="signal-list">
                    {teams.slice(0, 5).map((team) => <SignalRow key={team.teamId} team={team} />)}
                  </div>
                </div>
              </section>

              <section className="panel players-panel" id="players">
                <PanelHeader title="Player intelligence" subtitle="Performance score and per-90 output" action="Open scouting view" />
                <div className="player-grid">
                  {players.slice(0, 6).map((player, index) => (
                    <article className="player-card" key={player.playerId}>
                      <div className="player-number">{String(index + 1).padStart(2, "0")}</div>
                      <div className="player-card-main"><div className="player-id">{player.playerName ?? `Player ${player.playerId.slice(0, 8)}…`}</div><strong>{player.performanceScore ?? "—"}</strong><span>performance score</span></div>
                      <div className="player-stats"><span><b>{player.goalsPer90 ?? "—"}</b> G/90</span><span><b>{player.assistsPer90 ?? "—"}</b> A/90</span><span><b>{player.minutes || "—"}</b> min</span></div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, detail, accent, compact = false }: { label: string; value: string | number; detail: string; accent: string; compact?: boolean }) {
  return <article className={`metric-card accent-${accent}`}><div className="metric-label">{label}<span className="metric-spark">↗</span></div><strong className={compact ? "compact-value" : ""}>{value}</strong><span className="metric-detail">{detail}</span></article>;
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) {
  return <div className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-button">{action} <span>↗</span></button>}</div>;
}

function TeamRow({ team, rank }: { team: TeamAnalytics; rank: number }) {
  return <tr><td><span className={`rank rank-${rank}`}>{rank}</span></td><td><strong className="team-id">{team.teamName ?? `Team ${team.teamId.slice(0, 8)}…`}</strong><small className="entity-id">{team.teamShortName ?? team.teamId.slice(0, 8)}</small></td><td><FormPills form={team.form5} /></td><td>{team.matches}</td><td className={team.goalDifference >= 0 ? "positive" : "negative"}>{team.goalDifference > 0 ? "+" : ""}{team.goalDifference}</td><td><strong>{team.points}</strong></td><td><span className="elo-pill">{team.elo}</span></td></tr>;
}

function FormPills({ form }: { form: string }) {
  return <span className="form-pills" aria-label={`Recent form ${form || "unavailable"}`}>{form ? [...form].map((result, index) => <i key={`${result}-${index}`} className={`form-${result.toLowerCase()}`}>{result}</i>) : <span className="muted">—</span>}</span>;
}

function SignalRow({ team }: { team: TeamAnalytics }) {
  const strength = team.attackRating === null ? 0 : Math.min(100, Math.max(0, team.attackRating / 2));
  return <div className="signal-row"><div className="signal-copy"><strong>{team.teamName ?? `Team ${team.teamId.slice(0, 8)}…`}</strong><span>Attack index {team.attackRating ?? "—"}</span></div><div className="signal-bar"><i style={{ width: `${strength}%` }} /></div><b>{team.momentum === null ? "—" : team.momentum > 0 ? `+${team.momentum}` : team.momentum}</b></div>;
}

function LoadingState() {
  return <section className="loading-grid" aria-live="polite" aria-label="Loading analytics"><div className="skeleton skeleton-wide" /><div className="skeleton skeleton-wide" /><div className="skeleton skeleton-wide" /><div className="skeleton skeleton-panel" /></section>;
}

function EmptyState({ onLoad, loaded = false }: { onLoad: () => void; loaded?: boolean }) {
  return <section className="empty-state"><div className="empty-icon">◎</div><h2>{loaded ? "No analytics for this season" : "Choose a season to begin"}</h2><p>{loaded ? "The API returned no completed, validated team records for this season." : "Enter a season UUID above to query protected analytics. The dashboard will never invent metrics when data is unavailable."}</p>{loaded && <button onClick={onLoad}>Refresh data</button>}</section>;
}

function ErrorState({ error, onRetry }: { error: { error?: { code: string; message: string }; meta?: { requestId?: string } }; onRetry: () => void }) {
  const code = error.error?.code ?? "REQUEST_FAILED";
  const message = error.error?.message ?? "The analytics service could not be reached.";
  return <section className="error-state"><div className="error-icon">!</div><div><p className="eyebrow">{code}</p><h2>Analytics unavailable</h2><p>{message}</p>{error.meta?.requestId && <small>Request ID: {error.meta.requestId}</small>}</div><button onClick={onRetry}>Try again</button></section>;
}

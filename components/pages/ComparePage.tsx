"use client";

import { useEffect, useState } from "react";
import { OperationsShell } from "@/components/layout/OperationsShell";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { useSelectedSeason } from "./use-selected-season";

export function ComparePage() {
  const { seasons, seasonsLoading, seasonId, setSeasonId } = useSelectedSeason();
  const { teams, loading, error } = useDashboardData(seasonId);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  useEffect(() => { if (teams.length > 0) { setLeftId((current) => current || teams[0]?.teamId || ""); setRightId((current) => current || teams[1]?.teamId || teams[0]?.teamId || ""); } }, [teams]);
  const left = teams.find((team) => team.teamId === leftId);
  const right = teams.find((team) => team.teamId === rightId);
  return <OperationsShell title="Team comparison" section="Compare">
    <p className="page-lead">Compare two persisted team profiles across competitive results, form, Elo, attacking and defensive signals.</p>
    <div className="page-toolbar"><label>Season<select className="season-select" value={seasonId} onChange={(event) => { setSeasonId(event.target.value); setLeftId(""); setRightId(""); }}><option value="">{seasonsLoading ? "Discovering…" : "Select season"}</option>{seasons.map((season) => <option value={season.id} key={season.id}>{season.competition.canonicalName} · {season.name}</option>)}</select></label><label>Team A<select className="season-select" value={leftId} onChange={(event) => setLeftId(event.target.value)}>{teams.map((team) => <option value={team.teamId} key={team.teamId}>{team.teamName ?? team.teamId}</option>)}</select></label><label>Team B<select className="season-select" value={rightId} onChange={(event) => setRightId(event.target.value)}>{teams.map((team) => <option value={team.teamId} key={team.teamId}>{team.teamName ?? team.teamId}</option>)}</select></label></div>
    {loading && <div className="loading-grid"><div className="skeleton skeleton-panel" /></div>}
    {error && <div className="error-state compact-state"><div className="error-icon">!</div><div><h2>Comparison unavailable</h2><p>{error.error?.message ?? "Protected analytics could not be loaded."}</p></div></div>}
    {!loading && !error && left && right && <section className="comparison-grid">{[left, right].map((team) => <article className="panel comparison-card" key={team.teamId}><p className="eyebrow">{team.teamShortName ?? "TEAM"}</p><h2>{team.teamName ?? team.teamId}</h2><span className="entity-id">{team.teamId}</span><div className="comparison-score"><strong>{team.points}</strong><span>points</span></div><dl><Metric label="Record" value={`${team.wins}W · ${team.draws}D · ${team.losses}L`} /><Metric label="Goals" value={`${team.goalsFor} for / ${team.goalsAgainst} against`} /><Metric label="Goal difference" value={team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference} /><Metric label="Elo" value={team.elo} /><Metric label="Attack" value={team.attackRating ?? "—"} /><Metric label="Defense" value={team.defenseRating ?? "—"} /><Metric label="Recent form" value={team.form5 || "—"} /></dl></article>)}</section>}
  </OperationsShell>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="comparison-metric"><dt>{label}</dt><dd>{value}</dd></div>; }

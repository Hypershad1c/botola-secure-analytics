"use client";

import Link from "next/link";
import { OperationsShell } from "@/components/layout/OperationsShell";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { useSelectedSeason } from "./use-selected-season";

export function TeamsPage() {
  const { seasons, seasonsLoading, seasonId, setSeasonId } = useSelectedSeason();
  const { teams, loading, error } = useDashboardData(seasonId);
  return <OperationsShell title="Team intelligence" section="Teams">
    <p className="page-lead">Ranked team profiles built from completed canonical matches, with transparent form, Elo, attacking and defensive signals.</p>
    <div className="page-toolbar"><label>Season<select className="season-select" value={seasonId} onChange={(event) => setSeasonId(event.target.value)}><option value="">{seasonsLoading ? "Discovering…" : "Select season"}</option>{seasons.map((season) => <option value={season.id} key={season.id}>{season.competition.canonicalName} · {season.name}</option>)}</select></label><Link className="toolbar-button" href={seasonId ? `/compare?seasonId=${seasonId}` : "/compare"}>Compare teams ↗</Link></div>
    {loading && <div className="loading-grid"><div className="skeleton skeleton-panel" /></div>}
    {error && <div className="error-state compact-state"><div className="error-icon">!</div><div><h2>Team data unavailable</h2><p>{error.error?.message ?? "Protected analytics could not be loaded."}</p></div></div>}
    {!loading && !error && <section className="panel page-panel"><div className="panel-header"><div><h2>Season table</h2><p>{teams.length} canonical teams in the selected season</p></div></div><div className="table-wrap"><table><thead><tr><th>#</th><th>Team</th><th>Form</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Elo</th><th>Attack</th><th>Defense</th></tr></thead><tbody>{[...teams].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference).map((team, index) => <tr key={team.teamId}><td><span className={`rank rank-${index + 1}`}>{index + 1}</span></td><td><strong className="team-id">{team.teamName ?? team.teamId}</strong><small className="entity-id">{team.teamShortName ?? team.teamId.slice(0, 8)}</small></td><td><span className="form-pills">{[...team.form5].map((result, resultIndex) => <i key={`${result}-${resultIndex}`} className={`form-${result.toLowerCase()}`}>{result}</i>)}</span></td><td>{team.matches}</td><td>{team.wins}</td><td>{team.draws}</td><td>{team.losses}</td><td>{team.goalsFor}</td><td>{team.goalsAgainst}</td><td className={team.goalDifference >= 0 ? "positive" : "negative"}>{team.goalDifference > 0 ? "+" : ""}{team.goalDifference}</td><td><strong>{team.points}</strong></td><td><span className="elo-pill">{team.elo}</span></td><td>{team.attackRating ?? "—"}</td><td>{team.defenseRating ?? "—"}</td></tr>)}</tbody></table></div></section>}
  </OperationsShell>;
}

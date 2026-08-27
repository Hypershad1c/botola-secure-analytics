"use client";

import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { OperationsShell } from "@/components/layout/OperationsShell";
import { useSelectedSeason } from "./use-selected-season";

export function ReportsPage() {
  const { seasons, seasonsLoading, seasonId, setSeasonId } = useSelectedSeason();
  const { teams, players, loading, error } = useDashboardData(seasonId);
  function downloadCsv() {
    const rows = [["team","matches","wins","draws","losses","goals_for","goals_against","goal_difference","points","elo"], ...teams.map((team) => [team.teamName ?? team.teamId, team.matches, team.wins, team.draws, team.losses, team.goalsFor, team.goalsAgainst, team.goalDifference, team.points, team.elo])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `botola-season-${seasonId || "report"}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <OperationsShell title="Reports" section="Reports">
    <p className="page-lead">Generate a concise season report from the same protected analytics contracts used by the dashboard. Exports contain only loaded canonical records.</p>
    <div className="page-toolbar"><label>Season<select className="season-select" value={seasonId} onChange={(event) => setSeasonId(event.target.value)}><option value="">{seasonsLoading ? "Discovering…" : "Select season"}</option>{seasons.map((season) => <option value={season.id} key={season.id}>{season.competition.canonicalName} · {season.name}</option>)}</select></label><button className="toolbar-button" onClick={() => window.print()} disabled={!seasonId || loading}>Print report</button><button className="toolbar-button" onClick={downloadCsv} disabled={!seasonId || loading || teams.length === 0}>Download standings CSV</button></div>
    {error && <div className="error-state compact-state"><div className="error-icon">!</div><div><h2>Report data unavailable</h2><p>{error.error?.message ?? "Protected analytics could not be loaded."}</p></div></div>}
    {!loading && !error && seasonId && <section className="report-sheet"><header><p className="eyebrow">BOTOLA / VERIFIED SEASON REPORT</p><h2>Season performance brief</h2><p>Teams: {teams.length} · Players: {players.length} · Generated {new Date().toLocaleString()}</p></header><div className="report-columns"><div><h3>Standings leaders</h3>{teams.slice().sort((a, b) => b.points - a.points).slice(0, 5).map((team, index) => <div className="report-row" key={team.teamId}><span>{index + 1}</span><strong>{team.teamName ?? team.teamId}</strong><b>{team.points} pts</b></div>)}</div><div><h3>Player leaders</h3>{players.slice().sort((a, b) => (b.performanceScore ?? -1) - (a.performanceScore ?? -1)).slice(0, 5).map((player) => <div className="report-row" key={player.playerId}><span>◆</span><strong>{player.playerName ?? player.playerId}</strong><b>{player.performanceScore ?? "—"}</b></div>)}</div></div><p className="report-disclaimer">This report uses persisted completed-match analytics. It does not present unverified live data or unsupported predictions.</p></section>}
  </OperationsShell>;
}

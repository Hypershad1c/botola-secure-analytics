"use client";

import { useMemo, useState } from "react";
import { OperationsShell } from "@/components/layout/OperationsShell";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { useSelectedSeason } from "./use-selected-season";

export function PlayersPage({ scouting = false }: { scouting?: boolean }) {
  const { seasons, seasonsLoading, seasonId, setSeasonId } = useSelectedSeason();
  const { players, loading, error } = useDashboardData(seasonId);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"performance" | "goals" | "minutes">("performance");
  const filteredPlayers = useMemo(() => players.filter((player) => (player.playerName ?? player.playerId).toLowerCase().includes(search.toLowerCase()) || (player.playerTeamName ?? "").toLowerCase().includes(search.toLowerCase())).sort((left, right) => sort === "goals" ? right.goals - left.goals : sort === "minutes" ? right.minutes - left.minutes : (right.performanceScore ?? -1) - (left.performanceScore ?? -1)), [players, search, sort]);
  return <OperationsShell title={scouting ? "Scouting board" : "Player intelligence"} section={scouting ? "Scouting" : "Players"}>
    <p className="page-lead">{scouting ? "Filter the verified player pool by output, minutes and performance. Shortlist decisions remain grounded in canonical records." : "Season-level player output with per-90 production, minutes, goals, assists and consistency signals."}</p>
    <div className="page-toolbar"><label>Season<select className="season-select" value={seasonId} onChange={(event) => setSeasonId(event.target.value)}><option value="">{seasonsLoading ? "Discovering…" : "Select season"}</option>{seasons.map((season) => <option value={season.id} key={season.id}>{season.competition.canonicalName} · {season.name}</option>)}</select></label><label className="toolbar-search">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Player or team" /></label><label>Sort<select className="season-select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="performance">Performance</option><option value="goals">Goals</option><option value="minutes">Minutes</option></select></label></div>
    {loading && <div className="loading-grid"><div className="skeleton skeleton-panel" /></div>}
    {error && <div className="error-state compact-state"><div className="error-icon">!</div><div><h2>Player data unavailable</h2><p>{error.error?.message ?? "Protected analytics could not be loaded."}</p></div></div>}
    {!loading && !error && <section className="panel page-panel"><div className="panel-header"><div><h2>{filteredPlayers.length} player profiles</h2><p>Only persisted performance records are shown</p></div></div><div className="table-wrap"><table><thead><tr><th>Player</th><th>Team</th><th>MP</th><th>Min</th><th>G</th><th>A</th><th>xG</th><th>xA</th><th>G/90</th><th>A/90</th><th>Score</th><th>Consistency</th></tr></thead><tbody>{filteredPlayers.map((player) => <tr key={player.playerId}><td><strong className="team-id">{player.playerName ?? player.playerId}</strong><small className="entity-id">{player.playerId.slice(0, 8)}</small></td><td>{player.playerTeamName ?? "Multiple / unresolved"}</td><td>{player.matches}</td><td>{player.minutes}</td><td className="positive">{player.goals}</td><td>{player.assists}</td><td>{player.xg ?? "—"}</td><td>{player.xa ?? "—"}</td><td>{player.goalsPer90 ?? "—"}</td><td>{player.assistsPer90 ?? "—"}</td><td><strong>{player.performanceScore ?? "—"}</strong></td><td>{player.consistency ?? "—"}</td></tr>)}</tbody></table></div></section>}
  </OperationsShell>;
}

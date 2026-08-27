"use client";

import { useState } from "react";
import { OperationsShell } from "@/components/layout/OperationsShell";
import { useSelectedSeason } from "./use-selected-season";

export function AnalystPage() {
  const { seasons, seasonsLoading, seasonId, setSeasonId } = useSelectedSeason();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ text: string; scope: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!seasonId || !question.trim()) return;
    setLoading(true); setError(null); setAnswer(null);
    try {
      const response = await fetch("/api/v1/analyst", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ seasonId, question }) });
      const body = await response.json() as { data?: { answer: string; groundedIn: { teams: number; players: number } }; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "The analyst could not answer.");
      setAnswer({ text: body.data?.answer ?? "No answer returned.", scope: `${body.data?.groundedIn.teams ?? 0} teams · ${body.data?.groundedIn.players ?? 0} players` });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The analyst could not answer."); } finally { setLoading(false); }
  }
  return <OperationsShell title="AI football analyst" section="AI analyst">
    <p className="page-lead">Ask questions about the selected season. Answers are permission-controlled and grounded only in the bounded canonical analytics context; the provider must be configured by an operator.</p>
    <div className="page-toolbar"><label>Season<select className="season-select" value={seasonId} onChange={(event) => setSeasonId(event.target.value)}><option value="">{seasonsLoading ? "Discovering…" : "Select season"}</option>{seasons.map((season) => <option value={season.id} key={season.id}>{season.competition.canonicalName} · {season.name}</option>)}</select></label></div>
    <section className="panel analyst-panel"><div className="panel-header"><div><h2>Ask from canonical metrics</h2><p>Examples: Which teams have the strongest recent form? Which players lead performance score?</p></div></div><form className="analyst-form" onSubmit={ask}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a football question about this season…" maxLength={1000} /><button className="toolbar-button" disabled={!seasonId || !question.trim() || loading}>{loading ? "Analyzing…" : "Ask analyst"}</button></form>{error && <div className="analyst-error">{error}</div>}{answer && <article className="analyst-answer"><p className="eyebrow">GROUNDED ANSWER</p><div>{answer.text}</div><small>Context used: {answer.scope}. Treat interpretation as analysis, not a live fact.</small></article>}</section>
  </OperationsShell>;
}

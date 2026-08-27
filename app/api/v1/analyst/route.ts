import { z } from "zod";
import { requireApiPermission } from "@/lib/auth/api-auth";
import { db } from "@/lib/db";
import { getSeasonAnalytics } from "@/services/api/gateway";
import { jsonSuccess, observeApiRequest } from "@/services/api/http";
import { askGroundedAnalyst } from "@/services/ai/analyst";

const requestSchema = z.object({ seasonId: z.string().uuid(), question: z.string().trim().min(3).max(1_000) }).strict();

export async function POST(request: Request) {
  return observeApiRequest(request, "/api/v1/analyst", async (observedRequest, requestId) => {
    await requireApiPermission(observedRequest, "football.read");
    const input = requestSchema.parse(await observedRequest.json());
    const analytics = await getSeasonAnalytics(db, input.seasonId);
    const context = {
      seasonId: analytics.data.seasonId,
      teams: analytics.data.teams.slice().sort((left, right) => right.points - left.points).slice(0, 12).map((team) => ({ name: team.teamName, shortName: team.teamShortName, matches: team.matches, wins: team.wins, draws: team.draws, losses: team.losses, goalsFor: team.goalsFor, goalsAgainst: team.goalsAgainst, points: team.points, elo: team.elo, form5: team.form5, attackRating: team.attackRating, defenseRating: team.defenseRating })),
      players: analytics.data.players.slice().sort((left, right) => (right.performanceScore ?? -1) - (left.performanceScore ?? -1)).slice(0, 20).map((player) => ({ name: player.playerName, team: player.playerTeamName, matches: player.matches, minutes: player.minutes, goals: player.goals, assists: player.assists, goalsPer90: player.goalsPer90, assistsPer90: player.assistsPer90, performanceScore: player.performanceScore, consistency: player.consistency })),
      methodologyVersion: analytics.data.teams[0]?.methodologyVersion ?? analytics.data.players[0]?.methodologyVersion,
    };
    const answer = await askGroundedAnalyst({ question: input.question, context });
    return jsonSuccess({ answer, methodologyVersion: context.methodologyVersion, groundedIn: { teams: context.teams.length, players: context.players.length } }, requestId);
  });
}

# Phase 3 Analytics Engine and Aggregation Queries

## Scope

Phase 3 introduces deterministic football analytics over completed, validated match and player-performance records. The engine calculates team-season metrics, home/away splits, recent form, Elo ratings, momentum, consistency, strength of schedule, attack and defense ratings, and player-season totals with per-90 metrics.

Derived metrics are calculated from source-backed facts. The system does not write manually entered analytics values into the database and does not treat unavailable data as zero.

## Metric dictionary

| Metric | Definition | Null policy |
|---|---|---|
| Points | 3 for a win, 1 for a draw, 0 for a loss | `0` when no points have been earned after valid matches; aggregate fields require valid matches |
| Points per match | Points divided by completed matches | `null` when matches are zero |
| Goals per match | Goals scored divided by completed matches | `null` when matches are zero |
| Clean sheet | Match where the team conceded zero goals | `0` when valid matches exist and none are clean sheets |
| BTTS | Match where both teams scored at least one goal | `0` when valid matches exist and none qualify |
| Form | Chronological result sequence using `W`, `D`, and `L` | Empty string when no valid results exist |
| Elo | Sequential rating starting at 1500, K-factor 20, home advantage 50 | 1500 for a team with no processed matches |
| Momentum | Average points in the latest five results minus the preceding five | `null` until at least six results exist |
| Consistency | `1 / (1 + standard deviation of result points)` | `null` when fewer than two observations exist |
| Strength of schedule | Mean Elo of opponents faced | `null` when no opponents exist |
| Attack rating | Team goals per match divided by league goals per team per match, multiplied by 100 | `null` when league baseline or team matches are unavailable |
| Defense rating | League goals per team per match divided by team conceded per match, multiplied by 100 | `null` when unavailable; capped at 200 for a zero-concession sample |
| Goals per 90 | Goals multiplied by 90 divided by recorded minutes | `null` when minutes are zero or unavailable |
| Assists per 90 | Assists multiplied by 90 divided by recorded minutes | `null` when minutes are zero or unavailable |
| Player performance score | Mean of match contribution score: goals × 4 + assists × 3 + xG when available | `null` when no performance observations exist |

## Data eligibility

Only matches with `status = COMPLETED` and non-null home and away scores enter team aggregates and Elo. Postponed, cancelled, abandoned, scheduled, live, and scoreless-unknown records are excluded from completed-match calculations. Player metrics include completed matches only; missing minutes remain missing and do not become zero-minute appearances unless the source explicitly provides zero.

All chronological calculations sort by kickoff time ascending with match ID as a deterministic tie-breaker. This prevents result ordering from changing between runs when source rows arrive in a different order.

## Aggregation query strategy

The analytics repository uses three query boundaries:

1. `getCompletedMatchesForSeason` returns the minimal fact set required for chronological calculations.
2. `getPlayerPerformancesForSeason` returns player-match facts and extracts optional `xa` from source-backed JSON when available.
3. `aggregateTeamSeasonRows` performs a SQL-level home/away `UNION ALL` and computes wins, draws, losses, goals, points, clean sheets, and BTTS counts.

The SQL aggregate is intentionally retained alongside application-level calculations. It provides an efficient database summary for dashboards and a reconciliation baseline for the richer metric engine. A later phase can add materialized snapshots after the metric definitions stabilize.

## Reconciliation rule

For every team-season result, the application service should reconcile SQL counts with calculated counts. A mismatch is an operational data-quality error, not a reason to silently choose one result. The reconciliation record should include the season, team, metric name, SQL value, calculated value, and methodology version.

## Versioning and evolution

Every result contains `methodologyVersion = phase-3-v1`. Changing the Elo parameters, momentum window, consistency equation, performance-score weights, or null policy requires a new methodology version and a corresponding test fixture. Historical results must not change invisibly because a formula was edited.

## Query and index expectations

The existing `Match(seasonId, kickoffAt)` index supports chronological season reads. Production profiling should verify indexes for `Match(status, seasonId)`, `PlayerMatchStat(matchId, playerId)`, and `PlayerMatchStat(playerId, matchId)` before large imports. Any new index must be justified by an observed query plan or a documented expected access path.

# Phase 6 Machine-Learning Prediction Engine

## Objective

Phase 6 adds a reproducible baseline prediction engine for match outcomes. The first implementation is intentionally transparent and dependency-light: chronological feature engineering, a softmax outcome classifier, Poisson-style expected-goals regression, time-aware evaluation, model-version metadata, and prediction persistence.

## Leakage policy

For a target match, every feature must be computed from records with kickoff time strictly before the target match. The current match's score, events, player statistics, final standings, or any post-match correction must not enter its feature vector. Matches with identical timestamps use match ID as a deterministic tie-breaker, but production ingestion should prefer authoritative kickoff ordering.

The feature builder updates team history only after emitting the row's feature vector. A regression test changes the first match's final score and verifies that the first row's features remain unchanged while its target changes. This is the core leakage guard.

## Feature dictionary

| Feature | Definition |
|---|---|
| `home_form_points_5`, `away_form_points_5` | Mean points from the team's previous five completed matches, scaled by three |
| `home_attack_rate`, `away_attack_rate` | Smoothed prior goals scored per match using `(goals + 1) / (matches + 1)` |
| `home_defense_rate`, `away_defense_rate` | Smoothed prior goals conceded per match |
| `home_elo`, `away_elo` | Pre-match sequential Elo rating divided by the 1500 baseline |
| `home_home_strength`, `away_away_strength` | Prior venue-specific points rate over the last five venue matches |
| `home_recent_goals`, `away_recent_goals` | Mean goals scored over the previous five matches |
| `home_recent_conceded`, `away_recent_conceded` | Mean goals conceded over the previous five matches |
| `h2h_home_points_rate` | Prior home-team points divided by possible head-to-head points |
| `h2h_matches` | Prior meetings for the same home/away orientation, capped and scaled |

Unavailable history uses documented neutral priors. It is not silently replaced by current-season future data.

## Training and evaluation

Rows are sorted chronologically and split without shuffling. The validation window is the latest chronological portion, so it is always later than the training window. The model records accuracy, macro precision, macro recall, macro F1, multiclass log loss, Brier score, and expected calibration error.

The classifier outputs `HOME_WIN`, `DRAW`, and `AWAY_WIN` probabilities through softmax. Expected home and away goals use a log-link gradient model with non-negative exponentiated outputs. Confidence is the maximum outcome probability and is not a guarantee of the result.

## Versioning and persistence

Every model artifact records its model key, version, feature schema version, training dataset hash, hyperparameters, evaluation metrics, and optional artifact storage key. The Prisma migration adds `ModelVersion`, `Prediction`, and `PredictionResult`. Predictions retain the feature snapshot used at inference so later investigations can reproduce the model input.

A model must be persisted as `VALIDATED` before it can be promoted to `PRODUCTION`. Production promotion and rollback are governance operations and should be permission-controlled in the next administration phase.

## Operational boundary

Model training is exposed as `pnpm ml:train` and is not executed inside a Next.js request. The command accepts validated completed-match JSON and writes a model artifact to an ignored local artifact directory by default. Production training should run in a worker environment with a durable artifact store and a recorded dataset checksum.

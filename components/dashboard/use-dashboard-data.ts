"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiError, ApiResponse, PlayerAnalytics, TeamAnalytics } from "./types";

type DashboardState = {
  teams: TeamAnalytics[];
  players: PlayerAnalytics[];
  meta: ApiResponse<TeamAnalytics[]>["meta"] | null;
  loading: boolean;
  error: ApiError | null;
};

const initialState: DashboardState = { teams: [], players: [], meta: null, loading: false, error: null };

export function useDashboardData(seasonId: string) {
  const [state, setState] = useState<DashboardState>(initialState);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!seasonId) {
      setState({ ...initialState });
      return;
    }
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    const query = new URLSearchParams({ seasonId, page: "1", pageSize: "100" });
    Promise.all([
      fetch(`/api/v1/analytics/season?${query}`, { signal: controller.signal, credentials: "include" }),
      fetch(`/api/v1/analytics/players?${query}`, { signal: controller.signal, credentials: "include" }),
    ])
      .then(async ([teamResponse, playerResponse]) => {
        const teamPayload = (await teamResponse.json()) as ApiResponse<TeamAnalytics[]> | ApiError;
        const playerPayload = (await playerResponse.json()) as ApiResponse<PlayerAnalytics[]> | ApiError;
        if (!teamResponse.ok) throw teamPayload as ApiError;
        if (!playerResponse.ok) throw playerPayload as ApiError;
        setState({
          teams: (teamPayload as ApiResponse<TeamAnalytics[]>).data,
          players: (playerPayload as ApiResponse<PlayerAnalytics[]>).data,
          meta: (teamPayload as ApiResponse<TeamAnalytics[]>).meta,
          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState((current) => ({ ...current, loading: false, error: error as ApiError }));
      });
    return () => controller.abort();
  }, [seasonId, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((current) => current + 1), []);
  return { ...state, refresh };
}

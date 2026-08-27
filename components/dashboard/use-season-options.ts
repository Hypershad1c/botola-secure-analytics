"use client";

import { useEffect, useState } from "react";
import type { ApiError, ApiResponse } from "./types";

export type SeasonOption = { id: string; name: string; isCurrent: boolean; competition: { canonicalName: string; countryCode: string | null } };

export function useSeasonOptions() {
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/seasons", { signal: controller.signal, credentials: "include" })
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<SeasonOption[]> | ApiError;
        if (!response.ok) throw payload as ApiError;
        setSeasons((payload as ApiResponse<SeasonOption[]>).data);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason as ApiError);
        setLoading(false);
      });
    return () => controller.abort();
  }, []);
  return { seasons, loading, error };
}

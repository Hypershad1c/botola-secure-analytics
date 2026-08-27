"use client";

import { useEffect, useState } from "react";
import { useSeasonOptions } from "@/components/dashboard/use-season-options";

export function useSelectedSeason() {
  const { seasons, loading: seasonsLoading, error: seasonsError } = useSeasonOptions();
  const [seasonId, setSeasonId] = useState("");
  useEffect(() => {
    if (!seasonId && seasons[0]?.id) setSeasonId(seasons[0].id);
  }, [seasonId, seasons]);
  return { seasons, seasonsLoading, seasonsError, seasonId, setSeasonId };
}

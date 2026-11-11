"use client";
import { useLiveData } from "@/app/components/live/BackgroundDataSync";
import { useCallback, useEffect, useState } from "react";
import { EMPTY_OVERVIEW, type MunicipalOverviewData } from "./model";
import { readMunicipalOverview } from "./readData";
export function useMunicipalOverview() {
  const [data, setData] = useState<MunicipalOverviewData>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (revision === 0) setLoading(true);
      setError("");
      try {
        const result = await readMunicipalOverview(controller.signal);
        if (!cancelled) setData(result);
      } catch (error) {
        if (!cancelled) {
          if (revision === 0) setData(EMPTY_OVERVIEW);
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load the municipal overview.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [revision]);
  useLiveData({ onUpdate: refresh, disabled: loading });
  return { data, loading, error, refresh };
}

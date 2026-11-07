"use client";
import { useCallback, useEffect, useState } from "react";
import { EMPTY_OVERVIEW, type MunicipalOverviewData } from "./model";
import { readMunicipalOverview } from "./readData";
export function useMunicipalOverview() {
  const [data, setData] = useState<MunicipalOverviewData>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => {
    setLoading(true);
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await readMunicipalOverview(controller.signal);
        if (!cancelled) setData(result);
      } catch (error) {
        if (!cancelled) {
          setData(EMPTY_OVERVIEW);
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
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [refresh]);
  return { data, loading, error, refresh };
}

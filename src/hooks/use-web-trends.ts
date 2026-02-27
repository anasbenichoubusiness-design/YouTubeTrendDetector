"use client";

import { useState, useCallback } from "react";
import type { WebTrend } from "@/lib/types";

interface WebTrendsState {
  status: "idle" | "loading" | "success" | "error";
  trends: WebTrend[];
}

export function useWebTrends() {
  const [state, setState] = useState<WebTrendsState>({
    status: "idle",
    trends: [],
  });

  const fetch_ = useCallback(async (query: string) => {
    setState({ status: "loading", trends: [] });
    try {
      const res = await fetch("/api/web-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setState({ status: "success", trends: data.trends ?? [] });
    } catch {
      setState({ status: "error", trends: [] });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle", trends: [] });
  }, []);

  return { state, fetch: fetch_, reset };
}

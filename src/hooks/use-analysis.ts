"use client";

import { useState, useCallback } from "react";
import type { AnalyzeRequest, AnalyzeResponse, AnalysisState } from "@/lib/types";

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  const analyze = useCallback(async (params: AnalyzeRequest): Promise<void> => {
    setState({ status: "loading", startedAt: Date.now() });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          errorBody?.error ||
          errorBody?.message ||
          `Analysis failed (${response.status})`;
        throw new Error(message);
      }

      const data: AnalyzeResponse = await response.json();
      setState({ status: "success", data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setState({ status: "error", error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, analyze, reset };
}

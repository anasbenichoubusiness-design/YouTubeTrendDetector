"use client";

import { useState, useCallback } from "react";
import type { ChannelSpyResponse } from "@/lib/types";

type ChannelSpyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ChannelSpyResponse }
  | { status: "error"; error: string };

export function useChannelSpy() {
  const [state, setState] = useState<ChannelSpyState>({ status: "idle" });

  const analyze = useCallback(
    async (channelInput: string, apiKey: string) => {
      setState({ status: "loading" });

      try {
        const res = await fetch("/api/channel-spy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelInput, apiKey }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Failed (${res.status})`);
        }

        const data: ChannelSpyResponse = await res.json();
        setState({ status: "success", data });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setState({ status: "error", error: message });
      }
    },
    []
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, analyze, reset };
}

"use client";

import { useState, useCallback } from "react";
import type {
  AIVideoIdea,
  AIIdeasState,
  ScoredVideo,
  AIProvider,
} from "@/lib/types";
import { TITLE_PATTERNS, STOP_WORDS } from "@/lib/constants";

export function useAIIdeas() {
  const [state, setState] = useState<AIIdeasState>({
    status: "idle",
    ideas: [],
  });

  const generate = useCallback(
    async (params: {
      videos: ScoredVideo[];
      niche: string;
      aiProvider: AIProvider;
      aiApiKey: string;
    }) => {
      setState({ status: "loading", ideas: [] });

      try {
        // Send all videos (up to 50) for the AI to analyze
        const topVideos = params.videos.slice(0, 50).map((v) => ({
          title: v.snippet.title,
          views: v.stats.viewCount,
          likes: v.stats.likeCount,
          comments: v.stats.commentCount,
          subscriberCount: v.stats.subscriberCount,
          viewsToSubRatio: v.scores.viewsToSubRatio,
          velocity: v.scores.velocity,
          engagement: v.scores.engagement,
          composite: v.scores.composite,
          grade: v.grade,
          tags: v.snippet.tags,
          duration: v.snippet.duration,
          channelTitle: v.snippet.channelTitle,
          videoId: v.snippet.videoId,
        }));

        // Extract pattern analysis
        const patternCounts = new Map<
          string,
          { count: number; totalScore: number }
        >();
        for (const v of params.videos.slice(0, 30)) {
          for (const [regex, label] of TITLE_PATTERNS) {
            if (regex.test(v.snippet.title)) {
              const existing = patternCounts.get(label) || {
                count: 0,
                totalScore: 0,
              };
              patternCounts.set(label, {
                count: existing.count + 1,
                totalScore: existing.totalScore + v.scores.composite,
              });
            }
          }
        }
        const patternAnalysis = [...patternCounts.entries()]
          .map(([pattern, data]) => ({
            pattern,
            count: data.count,
            avgScore: data.totalScore / data.count,
          }))
          .filter((p) => p.count >= 2)
          .sort((a, b) => b.avgScore - a.avgScore);

        // Extract topic clusters from titles
        const keywordCounts = new Map<
          string,
          { count: number; totalScore: number }
        >();
        for (const v of params.videos.slice(0, 30)) {
          const words = v.snippet.title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
          const seen = new Set<string>();
          for (const w of words) {
            if (!seen.has(w)) {
              seen.add(w);
              const existing = keywordCounts.get(w) || {
                count: 0,
                totalScore: 0,
              };
              keywordCounts.set(w, {
                count: existing.count + 1,
                totalScore: existing.totalScore + v.scores.composite,
              });
            }
          }
        }
        const topicClusters = [...keywordCounts.entries()]
          .filter(([, data]) => data.count >= 2)
          .map(([topic, data]) => ({
            topic,
            videoCount: data.count,
            avgScore: data.totalScore / data.count,
          }))
          .sort((a, b) => b.avgScore * b.videoCount - a.avgScore * a.videoCount)
          .slice(0, 10);

        const res = await fetch("/api/generate-ai-ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aiProvider: params.aiProvider,
            aiApiKey: params.aiApiKey,
            niche: params.niche,
            topVideos,
            patternAnalysis,
            topicClusters,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string })?.error || `Request failed (${res.status})`
          );
        }

        const data = (await res.json()) as { ideas?: AIVideoIdea[] };
        setState({ status: "success", ideas: data.ideas || [] });
      } catch (err) {
        setState({
          status: "error",
          ideas: [],
          error: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ status: "idle", ideas: [] });
  }, []);

  return { state, generate, reset };
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, X, Loader2, Sparkles } from "lucide-react";
import type {
  VideoIdea,
  ScoredVideo,
  AIProvider,
  GeneratedTitle,
} from "@/lib/types";

interface AITitlesModalProps {
  idea: VideoIdea;
  videos: ScoredVideo[];
  niche: string;
  aiProvider: AIProvider;
  aiApiKey: string;
  onClose: () => void;
}

export function AITitlesModal({
  idea,
  videos,
  niche,
  aiProvider,
  aiApiKey,
  onClose,
}: AITitlesModalProps) {
  const [titles, setTitles] = useState<GeneratedTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [generated, setGenerated] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const topVideos = videos.slice(0, 5).map((v) => ({
        title: v.snippet.title,
        score: v.scores.composite,
        views: v.stats.viewCount,
        grade: v.grade,
      }));

      const res = await fetch("/api/generate-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProvider,
          aiApiKey,
          niche,
          idea,
          topVideos,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed (${res.status})`);
      }

      const data = await res.json();
      setTitles(data.titles || []);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copyTitle(title: string, idx: number) {
    navigator.clipboard.writeText(title);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              AI Title Generator
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Idea context */}
          <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              Based on idea
            </p>
            <p className="text-sm text-zinc-200">{idea.suggestedTitle}</p>
          </div>

          {/* Generate button */}
          {!generated && !loading && (
            <Button
              onClick={handleGenerate}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4" />
              Generate 8 Title Suggestions
            </Button>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating titles with {aiProvider === "claude" ? "Claude" : "GPT"}...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                className="mt-2 text-red-300 hover:text-red-100"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Titles */}
          {titles.length > 0 && (
            <div className="space-y-2">
              {titles.map((t, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100">
                      {t.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{t.reasoning}</p>
                  </div>
                  <button
                    onClick={() => copyTitle(t.title, i)}
                    className="shrink-0 p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    title="Copy title"
                  >
                    {copiedIdx === i ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Regenerate */}
          {generated && !loading && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              className="w-full border-zinc-700 text-zinc-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAnalysis } from "@/hooks/use-analysis";
import { useApiKey } from "@/hooks/use-api-key";
import { useAIIdeas } from "@/hooks/use-ai-ideas";
import { useWebTrends } from "@/hooks/use-web-trends";
import { useChannelSpy } from "@/hooks/use-channel-spy";
import { AIIdeasPanel } from "@/components/dashboard/ai-ideas-panel";
import { GradeBadge } from "@/components/dashboard/grade-badge";
import { ExportButton } from "@/components/dashboard/export-button";
import { AnalysisProgress } from "@/components/dashboard/analysis-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Key,
  Sparkles,
  TrendingUp,
  Loader2,
  ArrowRight,
  Newspaper,
  ExternalLink,
  Wand2,
  X,
  Copy,
  Check,
  Eye,
  Loader2 as Loader2Icon,
} from "lucide-react";
import type { ScoredVideo, AIProvider, MyVersionBrief } from "@/lib/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const NICHES = [
  "AI Agents",
  "AI Tools",
  "Photography",
  "Tech Reviews",
  "Gaming",
  "Personal Finance",
  "Fitness",
  "Cooking",
  "Travel Vlogging",
  "Music Production",
  "Education",
  "Productivity",
];

const MARKETS = [
  { code: "US", label: "USA" },
  { code: "GB", label: "UK" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── TrendCard ───────────────────────────────────────────────────────────────

function TrendCard({
  video,
  onMakeVersion,
}: {
  video: ScoredVideo;
  onMakeVersion: (video: ScoredVideo) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden hover:border-zinc-700 hover:bg-zinc-900/60 transition-all duration-200 group">
      {/* Thumbnail */}
      <a
        href={`https://youtube.com/watch?v=${video.snippet.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="relative aspect-video bg-zinc-800">
          {video.snippet.thumbnailUrl && (
            <img
              src={video.snippet.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          <div className="absolute top-2 left-2">
            <GradeBadge grade={video.grade} />
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded font-mono text-zinc-300">
            #{video.rank}
          </div>
        </div>
      </a>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <a
          href={`https://youtube.com/watch?v=${video.snippet.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <h3 className="text-sm font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
            {video.snippet.title}
          </h3>
        </a>
        <p className="text-xs text-zinc-500 truncate">
          {video.snippet.channelTitle}
          {video.stats.subscriberCount > 0 && (
            <span className="text-zinc-600">
              {" "}
              · {formatNum(video.stats.subscriberCount)} subs
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
          <span className="font-medium text-zinc-400">
            {formatNum(video.stats.viewCount)} views
          </span>
          <span className="text-zinc-700">·</span>
          <span>{formatNum(Math.round(video.scores.velocity))}/day</span>
          <span className="text-zinc-700">·</span>
          <span>{video.scores.engagement.toFixed(1)}%</span>
          <span className="text-zinc-700">·</span>
          <span className="font-mono">{video.scores.composite.toFixed(1)}</span>
        </div>
        <button
          onClick={() => onMakeVersion(video)}
          className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-600/30 hover:border-purple-500/50 transition-all"
        >
          <Wand2 className="h-3 w-3" />
          Make My Version
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const { state, analyze, reset } = useAnalysis();
  const {
    apiKey,
    aiApiKey,
    aiProvider,
    isLoaded,
    serverConfigured,
    saveApiKey,
    saveAIKey,
  } = useApiKey();
  const aiIdeas = useAIIdeas();
  const webTrends = useWebTrends();
  const channelSpy = useChannelSpy();

  // Selection state
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [customNiche, setCustomNiche] = useState("");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(["US"]);
  const [showAll, setShowAll] = useState(false);

  // Channel Spy state
  const [channelInput, setChannelInput] = useState("");
  const [showAllChannel, setShowAllChannel] = useState(false);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [ytKeyInput, setYtKeyInput] = useState("");
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [aiProviderInput, setAiProviderInput] = useState<AIProvider>("claude");

  // Make My Version state
  const [versionModal, setVersionModal] = useState<{
    status: "idle" | "loading" | "success" | "error";
    video: ScoredVideo | null;
    brief: MyVersionBrief | null;
    error?: string;
  }>({ status: "idle", video: null, brief: null });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Thumbnail language filter state
  const [thumbFilter, setThumbFilter] = useState<{
    status: "idle" | "checking" | "done";
    nonEnglishIds: Set<string>;
  }>({ status: "idle", nonEnglishIds: new Set() });

  // Auto-check thumbnails when analysis completes
  const checkThumbnails = useCallback(
    async (videos: ScoredVideo[]) => {
      const effectiveAiKey = aiApiKey || "";
      if (!effectiveAiKey && !serverConfigured.ai) return;

      setThumbFilter({ status: "checking", nonEnglishIds: new Set() });
      try {
        const videoIds = videos.map((v) => v.snippet.videoId);
        const res = await fetch("/api/check-thumbnails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoIds,
            aiProvider,
            aiApiKey: effectiveAiKey,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { nonEnglishVideoIds: string[] };
          setThumbFilter({
            status: "done",
            nonEnglishIds: new Set(data.nonEnglishVideoIds || []),
          });
        } else {
          setThumbFilter({ status: "done", nonEnglishIds: new Set() });
        }
      } catch {
        setThumbFilter({ status: "done", nonEnglishIds: new Set() });
      }
    },
    [aiApiKey, aiProvider, serverConfigured.ai]
  );

  useEffect(() => {
    if (state.status === "success" && state.data.videos.length > 0) {
      checkThumbnails(state.data.videos);
    }
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed
  const activeNiche = selectedNiche || customNiche.trim();
  const isLoading = state.status === "loading";
  const hasData = state.status === "success";
  const hasError = state.status === "error";
  const hasAIIdeas =
    aiIdeas.state.status === "success" && aiIdeas.state.ideas.length > 0;
  const isFilteringThumbs = thumbFilter.status === "checking";

  // Videos with non-English thumbnails removed
  const filteredVideos =
    hasData && thumbFilter.status === "done" && thumbFilter.nonEnglishIds.size > 0
      ? state.data.videos.filter((v) => !thumbFilter.nonEnglishIds.has(v.snippet.videoId))
      : hasData
        ? state.data.videos
        : [];

  // Handlers
  function handleSelectNiche(niche: string) {
    if (selectedNiche === niche) {
      setSelectedNiche(null);
    } else {
      setSelectedNiche(niche);
      setCustomNiche("");
    }
  }

  function handleCustomNicheChange(value: string) {
    setCustomNiche(value);
    if (value.trim()) setSelectedNiche(null);
  }

  function toggleMarket(code: string) {
    setSelectedMarkets((prev) => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  }

  function handleAnalyze() {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    if (!activeNiche) return;
    aiIdeas.reset();
    setThumbFilter({ status: "idle", nonEnglishIds: new Set() });
    webTrends.fetch(activeNiche);
    setShowAll(false);
    analyze({
      niche: activeNiche,
      apiKey,
      regions: selectedMarkets,
      maxPages: 3,
      publishedWithinDays: 14,
      minViews: 1000,
      includeShorts: false,
    });
  }

  function handleGenerateAIIdeas() {
    if (!aiApiKey) {
      setShowSettings(true);
      return;
    }
    if (state.status !== "success") return;
    aiIdeas.generate({
      videos: filteredVideos,
      niche: state.data.query,
      aiProvider,
      aiApiKey,
    });
  }

  async function handleMakeVersion(video: ScoredVideo) {
    if (!aiApiKey) {
      setShowSettings(true);
      return;
    }
    setVersionModal({ status: "loading", video, brief: null });
    try {
      const res = await fetch("/api/make-my-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiProvider,
          aiApiKey,
          niche: activeNiche,
          videoId: video.snippet.videoId,
          video: {
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            views: video.stats.viewCount,
            engagement: video.scores.engagement,
            velocity: video.scores.velocity,
            grade: video.grade,
            tags: video.snippet.tags,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setVersionModal({ status: "success", video, brief: data.brief });
    } catch (err) {
      setVersionModal({
        status: "error",
        video,
        brief: null,
        error: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleChannelSpy() {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }
    if (!channelInput.trim()) return;
    setShowAllChannel(false);
    channelSpy.analyze(channelInput.trim(), apiKey);
  }

  function handleChannelKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && channelInput.trim()) {
      e.preventDefault();
      handleChannelSpy();
    }
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (ytKeyInput.trim()) saveApiKey(ytKeyInput.trim());
    if (aiKeyInput.trim()) saveAIKey(aiKeyInput.trim(), aiProviderInput);
    setShowSettings(false);
    setYtKeyInput("");
    setAiKeyInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && activeNiche) {
      e.preventDefault();
      handleAnalyze();
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  const visibleVideos =
    hasData
      ? showAll
        ? filteredVideos
        : filteredVideos.slice(0, 12)
      : [];

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800/50 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              TrendDetector
            </span>
          </div>
          <div className="flex items-center gap-2">
            {apiKey && (
              <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                API Connected
              </span>
            )}
            {/* Hide settings gear when all keys are server-configured */}
            {!(serverConfigured.yt && serverConfigured.ai) && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Settings Modal ──────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Settings
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* YouTube API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-emerald-400" />
                  YouTube API Key
                  {serverConfigured.yt ? (
                    <span className="text-xs text-emerald-400 ml-auto">
                      Server configured
                    </span>
                  ) : apiKey ? (
                    <span className="text-xs text-emerald-400 ml-auto">
                      Set
                    </span>
                  ) : null}
                </label>
                {serverConfigured.yt ? (
                  <p className="text-xs text-zinc-500">
                    Pre-configured by the server admin. No action needed.
                  </p>
                ) : (
                  <>
                    <Input
                      type="password"
                      placeholder={apiKey ? "••••••••••" : "AIza..."}
                      value={ytKeyInput}
                      onChange={(e) => setYtKeyInput(e.target.value)}
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                    />
                    <p className="text-xs text-zinc-500">
                      Free from{" "}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Google Cloud Console
                      </a>
                    </p>
                  </>
                )}
              </div>

              {/* AI Provider */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  AI Provider
                  {serverConfigured.ai ? (
                    <span className="text-xs text-purple-400 ml-auto">
                      Server configured
                    </span>
                  ) : aiApiKey ? (
                    <span className="text-xs text-purple-400 ml-auto">
                      Set
                    </span>
                  ) : null}
                </label>
                {serverConfigured.ai ? (
                  <p className="text-xs text-zinc-500">
                    Pre-configured by the server admin. No action needed.
                  </p>
                ) : (
                  <>
                    <Select
                      value={aiProviderInput}
                      onValueChange={(v) => setAiProviderInput(v as AIProvider)}
                    >
                      <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-200 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                        <SelectItem value="openai">GPT (OpenAI)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="password"
                      placeholder={
                        aiApiKey
                          ? "••••••••••"
                          : aiProviderInput === "claude"
                            ? "sk-ant-..."
                            : "sk-..."
                      }
                      value={aiKeyInput}
                      onChange={(e) => setAiKeyInput(e.target.value)}
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                    />
                    <p className="text-xs text-zinc-500">
                      Powers AI-generated video ideas
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSettings(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Main Content ────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* ─── Hero / Input Section ────────────────────────────────── */}
        <section
          className={`${hasData ? "py-8" : "py-16 sm:py-24"} transition-all duration-500`}
        >
          {/* Hero text (only when no results) */}
          {!hasData && !isLoading && (
            <div className="text-center mb-12">
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
                Find what&apos;s trending.
                <br />
                <span className="text-zinc-500">Create what&apos;s next.</span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 max-w-lg mx-auto">
                Pick a niche, choose your markets, and discover outlier videos
                you can turn into your next upload.
              </p>
            </div>
          )}

          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Niche Chips */}
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 block">
                Pick a niche
              </label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((niche) => (
                  <button
                    key={niche}
                    onClick={() => handleSelectNiche(niche)}
                    disabled={isLoading}
                    className={`px-3.5 py-1.5 rounded-full text-sm transition-all duration-150 ${
                      selectedNiche === niche
                        ? "bg-white text-black font-medium shadow-lg shadow-white/10"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {niche}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
                Or type your own
              </label>
              <Input
                placeholder="e.g. drone cinematography, sourdough baking..."
                value={customNiche}
                onChange={(e) => handleCustomNicheChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-11"
                disabled={isLoading}
              />
            </div>

            {/* Market Chips */}
            <div>
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3 block">
                Markets
              </label>
              <div className="flex flex-wrap gap-2">
                {MARKETS.map((market) => (
                  <button
                    key={market.code}
                    onClick={() => toggleMarket(market.code)}
                    disabled={isLoading}
                    className={`px-3.5 py-1.5 rounded-full text-sm transition-all duration-150 ${
                      selectedMarkets.includes(market.code)
                        ? "bg-blue-600 text-white font-medium"
                        : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {market.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !activeNiche}
              className="w-full h-12 text-base font-medium bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing trends...
                </>
              ) : (
                <>
                  Find Trends
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </section>

        {/* ─── Loading ────────────────────────────────────────────── */}
        {isLoading && (
          <div className="pb-12">
            <AnalysisProgress isLoading={true} />
          </div>
        )}

        {/* ─── Thumbnail Filtering ──────────────────────────────── */}
        {isFilteringThumbs && hasData && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-8 flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-amber-300" />
            <p className="text-sm text-amber-300">
              Scanning thumbnails for non-English text...
            </p>
          </div>
        )}

        {/* ─── Error ──────────────────────────────────────────────── */}
        {hasError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-8">
            <p className="text-sm text-red-400">{state.error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="mt-2 text-red-300 hover:text-red-100"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* ─── Web Trends ─────────────────────────────────────────── */}
        {webTrends.state.status === "success" && webTrends.state.trends.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
                What&apos;s new on the web
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {webTrends.state.trends.slice(0, 6).map((trend, i) => (
                <a
                  key={i}
                  href={trend.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 line-clamp-2 group-hover:text-white transition-colors">
                      {trend.title}
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      {trend.source}
                      {trend.publishedAt && (
                        <span>
                          {" · "}
                          {new Date(trend.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ─── Results ────────────────────────────────────────────── */}
        {hasData && (
          <section className="pb-16 space-y-8">
            {/* Results Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">
                  Trending in &ldquo;{state.data.query}&rdquo;
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {filteredVideos.length} outlier videos
                  {thumbFilter.status === "done" && thumbFilter.nonEnglishIds.size > 0 && (
                    <span className="text-zinc-600">
                      {" "}({thumbFilter.nonEnglishIds.size} non-English filtered out)
                    </span>
                  )}
                  {" "}· {selectedMarkets.join(", ")} ·{" "}
                  {state.data.quotaUsed} API units used
                </p>
              </div>
              <ExportButton
                videos={filteredVideos}
                ideas={state.data.ideas}
                activeTab="outliers"
              />
            </div>

            {/* Video Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleVideos.map((video) => (
                <TrendCard key={video.snippet.videoId} video={video} onMakeVersion={handleMakeVersion} />
              ))}
            </div>

            {/* Show more */}
            {!showAll && filteredVideos.length > 12 && (
              <div className="text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4"
                >
                  Show all {filteredVideos.length} videos
                </button>
              </div>
            )}

            {/* ─── AI Ideas Section ──────────────────────────────────── */}
            <div className="border-t border-zinc-800/50 pt-8">
              {aiIdeas.state.status === "idle" && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 text-center">
                  <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                    Generate Video Ideas
                  </h3>
                  <p className="text-sm text-zinc-500 mb-5 max-w-md mx-auto">
                    AI will analyze every trending video and generate a video
                    brief for each distinct trend — with clear titles, detailed
                    outlines, hooks, and thumbnail concepts.
                  </p>
                  <Button
                    onClick={handleGenerateAIIdeas}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                  >
                    <Sparkles className="h-4 w-4" />
                    {aiApiKey ? "Generate Ideas" : "Set AI Key in Settings First"}
                  </Button>
                </div>
              )}

              {aiIdeas.state.status === "loading" && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-8 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-700 border-t-purple-300 mx-auto mb-4" />
                  <p className="text-sm text-purple-300 font-medium">
                    Generating video ideas from{" "}
                    {state.data.videos.length} trending videos...
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    This takes 15-20 seconds
                  </p>
                </div>
              )}

              {aiIdeas.state.status === "error" && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-400">
                    {aiIdeas.state.error}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateAIIdeas}
                      className="text-red-300 hover:text-red-100"
                    >
                      Retry
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={aiIdeas.reset}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {hasAIIdeas && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Video Ideas ({aiIdeas.state.ideas.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateAIIdeas}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Regenerate
                    </Button>
                  </div>
                  <AIIdeasPanel ideas={aiIdeas.state.ideas} />
                </div>
              )}
            </div>
          </section>
        )}
        {/* ─── Channel Spy ──────────────────────────────────────── */}
        <section className="pb-16">
          <div className="border-t border-zinc-800/50 pt-10">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                Channel Spy
              </h2>
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Enter any YouTube channel to see their videos and make your own version of any one.
            </p>

            {/* Channel Input */}
            <div className="flex gap-2 max-w-2xl">
              <Input
                placeholder="@MrBeast, channel URL, or channel ID"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                onKeyDown={handleChannelKeyDown}
                className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-11 flex-1"
                disabled={channelSpy.state.status === "loading"}
              />
              <Button
                onClick={handleChannelSpy}
                disabled={channelSpy.state.status === "loading" || !channelInput.trim()}
                className="h-11 px-5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {channelSpy.state.status === "loading" ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Spy Channel
                  </>
                )}
              </Button>
            </div>

            {/* Channel Spy Error */}
            {channelSpy.state.status === "error" && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mt-4">
                <p className="text-sm text-red-400">{channelSpy.state.error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={channelSpy.reset}
                  className="mt-2 text-red-300 hover:text-red-100"
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Channel Spy Results */}
            {channelSpy.state.status === "success" && (
              <div className="mt-6 space-y-6">
                {/* Channel Header */}
                <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  {channelSpy.state.data.channel.thumbnailUrl && (
                    <img
                      src={channelSpy.state.data.channel.thumbnailUrl}
                      alt=""
                      className="h-12 w-12 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-100 truncate">
                      {channelSpy.state.data.channel.title}
                    </h3>
                    <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                      <span>{formatNum(channelSpy.state.data.channel.subscriberCount)} subs</span>
                      <span>{formatNum(channelSpy.state.data.channel.totalViews)} total views</span>
                      <span>{channelSpy.state.data.videos.length} videos analyzed</span>
                    </div>
                  </div>
                </div>

                {/* Channel Videos Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(showAllChannel
                    ? channelSpy.state.data.videos
                    : channelSpy.state.data.videos.slice(0, 12)
                  ).map((video) => (
                    <TrendCard
                      key={video.snippet.videoId}
                      video={video}
                      onMakeVersion={handleMakeVersion}
                    />
                  ))}
                </div>

                {/* Show more */}
                {!showAllChannel && channelSpy.state.data.videos.length > 12 && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowAllChannel(true)}
                      className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4"
                    >
                      Show all {channelSpy.state.data.videos.length} videos
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ─── Make My Version Modal ─────────────────────────────────── */}
      {versionModal.status !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-purple-400" />
                <h2 className="text-base font-semibold text-zinc-100">
                  Make My Version
                </h2>
              </div>
              <button
                onClick={() => setVersionModal({ status: "idle", video: null, brief: null })}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Source Video */}
            {versionModal.video && (
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs text-zinc-500 mb-1">Based on:</p>
                <p className="text-sm text-zinc-300 font-medium">
                  &ldquo;{versionModal.video.snippet.title}&rdquo;
                  <span className="text-zinc-600"> by {versionModal.video.snippet.channelTitle}</span>
                </p>
              </div>
            )}

            {/* Loading */}
            {versionModal.status === "loading" && (
              <div className="p-12 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-700 border-t-purple-300 mx-auto mb-4" />
                <p className="text-sm text-purple-300 font-medium">
                  Reading video transcript & generating your version...
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Transcribing video, then writing title, hook, outline & script — 20-30 seconds
                </p>
              </div>
            )}

            {/* Error */}
            {versionModal.status === "error" && (
              <div className="p-5">
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-400">{versionModal.error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => versionModal.video && handleMakeVersion(versionModal.video)}
                    className="mt-2 text-red-300 hover:text-red-100"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Success — The Brief */}
            {versionModal.status === "success" && versionModal.brief && (
              <div className="p-5 space-y-5">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Your Title</span>
                    <button onClick={() => copyToClipboard(versionModal.brief!.title, "title")} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                      {copiedField === "title" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="text-lg font-bold text-zinc-100">{versionModal.brief.title}</p>
                </div>

                {/* Hook */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Hook — First 60 Seconds</span>
                    <button onClick={() => copyToClipboard(versionModal.brief!.hook, "hook")} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                      {copiedField === "hook" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{versionModal.brief.hook}</p>
                  </div>
                </div>

                {/* Unique Angle */}
                <div>
                  <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider block mb-1">What Makes Yours Different</span>
                  <p className="text-sm text-zinc-400">{versionModal.brief.uniqueAngle}</p>
                </div>

                {/* Outline */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Full Outline</span>
                    <button onClick={() => copyToClipboard(versionModal.brief!.outline.join("\n\n"), "outline")} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                      {copiedField === "outline" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <ol className="space-y-2">
                    {versionModal.brief.outline.map((section, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-purple-500/60 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                        <span className="text-zinc-300 leading-relaxed">{section}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Script */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Opening Script (after hook)</span>
                    <button onClick={() => copyToClipboard(versionModal.brief!.script, "script")} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                      {copiedField === "script" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{versionModal.brief.script}</p>
                  </div>
                </div>

                {/* Thumbnail */}
                <div>
                  <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider block mb-1">Thumbnail Concept</span>
                  <p className="text-sm text-zinc-400">{versionModal.brief.thumbnailConcept}</p>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>Length: <span className="text-zinc-300">{versionModal.brief.optimalLength}</span></span>
                  <span className="text-zinc-700">·</span>
                  <span>Tags: <span className="text-zinc-400">{versionModal.brief.suggestedTags.join(", ")}</span></span>
                </div>

                {/* Copy All */}
                <div className="pt-2 border-t border-zinc-800/50">
                  <button
                    onClick={() => {
                      const b = versionModal.brief!;
                      const full = `TITLE: ${b.title}\n\nHOOK:\n${b.hook}\n\nUNIQUE ANGLE:\n${b.uniqueAngle}\n\nOUTLINE:\n${b.outline.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nSCRIPT:\n${b.script}\n\nTHUMBNAIL: ${b.thumbnailConcept}\n\nLENGTH: ${b.optimalLength}\nTAGS: ${b.suggestedTags.join(", ")}`;
                      copyToClipboard(full, "all");
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-600/30 transition-all"
                  >
                    {copiedField === "all" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedField === "all" ? "Copied!" : "Copy Everything"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

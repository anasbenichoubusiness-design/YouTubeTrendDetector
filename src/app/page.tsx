"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchForm, type SearchFormParams } from "@/components/dashboard/search-form";
import { OutlierTable } from "@/components/dashboard/outlier-table";
import { IdeasCards } from "@/components/dashboard/ideas-cards";
import { StatsSummary } from "@/components/dashboard/stats-summary";
import { ExportButton } from "@/components/dashboard/export-button";
import { AnalysisProgress } from "@/components/dashboard/analysis-progress";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useAnalysis } from "@/hooks/use-analysis";
import { useApiKey } from "@/hooks/use-api-key";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Key, TrendingUp } from "lucide-react";

export default function Home() {
  const { state, analyze, reset } = useAnalysis();
  const { apiKey, isLoaded, saveApiKey } = useApiKey();
  const [activeTab, setActiveTab] = useState("outliers");
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const isLoading = state.status === "loading";
  const hasData = state.status === "success";
  const hasError = state.status === "error";

  function handleAnalyze(params: SearchFormParams) {
    if (!apiKey) {
      setShowKeyPrompt(true);
      return;
    }
    analyze({
      ...params,
      apiKey,
    });
  }

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (keyInput.trim()) {
      saveApiKey(keyInput.trim());
      setShowKeyPrompt(false);
      setKeyInput("");
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              YouTube Trend Detector
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {apiKey ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Key className="h-3 w-3" />
                <span className="hidden sm:inline">API Key Set</span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyPrompt(true)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Settings className="h-4 w-4" />
                Set API Key
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* API Key Prompt Modal */}
      {showKeyPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">
              YouTube API Key Required
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Enter your YouTube Data API v3 key. You can get one free from the{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Google Cloud Console
              </a>
              . Your key is stored locally in your browser.
            </p>
            <form onSubmit={handleSaveKey} className="space-y-3">
              <Input
                type="password"
                placeholder="AIza..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="bg-zinc-900/50 border-zinc-700 text-zinc-100"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowKeyPrompt(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!keyInput.trim()}>
                  Save Key
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Search */}
        <SearchForm onAnalyze={handleAnalyze} isLoading={isLoading} />

        {/* Loading Progress */}
        {isLoading && <AnalysisProgress isLoading={true} />}

        {/* Error */}
        {hasError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
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

        {/* Results */}
        {hasData && (
          <>
            <StatsSummary
              videos={state.data.videos}
              quotaUsed={state.data.quotaUsed}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                  <TabsTrigger
                    value="outliers"
                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                  >
                    Outlier Videos ({state.data.videos.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="ideas"
                    className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
                  >
                    Video Ideas ({state.data.ideas.length})
                  </TabsTrigger>
                </TabsList>
                <ExportButton
                  videos={state.data.videos}
                  ideas={state.data.ideas}
                  activeTab={activeTab}
                />
              </div>

              <TabsContent value="outliers" className="mt-4">
                <OutlierTable videos={state.data.videos} />
              </TabsContent>
              <TabsContent value="ideas" className="mt-4">
                <IdeasCards ideas={state.data.ideas} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Empty State */}
        {state.status === "idle" && <EmptyState />}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

export interface SearchFormParams {
  niche: string;
  maxPages: number;
  publishedWithinDays: number;
  minViews: number;
  region: string;
  includeShorts: boolean;
}

interface SearchFormProps {
  onAnalyze: (params: SearchFormParams) => void;
  isLoading: boolean;
}

const REGIONS = [
  { value: "US", label: "US - United States" },
  { value: "GB", label: "GB - United Kingdom" },
  { value: "CA", label: "CA - Canada" },
  { value: "AU", label: "AU - Australia" },
  { value: "IN", label: "IN - India" },
  { value: "DE", label: "DE - Germany" },
  { value: "FR", label: "FR - France" },
  { value: "BR", label: "BR - Brazil" },
  { value: "JP", label: "JP - Japan" },
];

export function SearchForm({ onAnalyze, isLoading }: SearchFormProps) {
  const [niche, setNiche] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxPages, setMaxPages] = useState("3");
  const [publishedWithinDays, setPublishedWithinDays] = useState("14");
  const [minViews, setMinViews] = useState("1000");
  const [region, setRegion] = useState("US");
  const [includeShorts, setIncludeShorts] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!niche.trim()) return;

    onAnalyze({
      niche: niche.trim(),
      maxPages: parseInt(maxPages, 10),
      publishedWithinDays: parseInt(publishedWithinDays, 10),
      minViews: parseInt(minViews, 10) || 0,
      region,
      includeShorts,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Enter a niche or topic (e.g. productivity tips, react tutorials)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
            required
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading || !niche.trim()} className="min-w-[120px]">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Analyze
            </>
          )}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {showAdvanced ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        Advanced Filters
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Max Pages
            </label>
            <Select value={maxPages} onValueChange={setMaxPages}>
              <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-200 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "5"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v} {v === "1" ? "page" : "pages"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Published Within
            </label>
            <Select
              value={publishedWithinDays}
              onValueChange={setPublishedWithinDays}
            >
              <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-200 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  { v: "7", l: "7 days" },
                  { v: "14", l: "14 days" },
                  { v: "30", l: "30 days" },
                  { v: "60", l: "60 days" },
                ].map(({ v, l }) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Min Views
            </label>
            <Input
              type="number"
              value={minViews}
              onChange={(e) => setMinViews(e.target.value)}
              min={0}
              className="bg-zinc-900/50 border-zinc-700 text-zinc-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Region</label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-zinc-200 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Include Shorts
            </label>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={includeShorts}
                onCheckedChange={setIncludeShorts}
              />
              <span className="text-xs text-zinc-500">
                {includeShorts ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { VideoIdea, IdeaType, CompetitionLevel } from "@/lib/types";

interface IdeasCardsProps {
  ideas: VideoIdea[];
}

const TYPE_STYLES: Record<IdeaType, string> = {
  "Trending Topic": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Standout Video": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Winning Format": "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const COMPETITION_STYLES: Record<CompetitionLevel, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function IdeasCards({ ideas }: IdeasCardsProps) {
  if (ideas.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No video ideas generated yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ideas.map((idea) => (
        <Card
          key={idea.id}
          className="bg-zinc-900/50 border-zinc-800 flex flex-col"
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono text-zinc-600">
                #{idea.id}
              </span>
              <Badge
                variant="outline"
                className={TYPE_STYLES[idea.type] || ""}
              >
                {idea.type}
              </Badge>
            </div>
            <CardTitle className="text-base leading-snug text-zinc-100 mt-2">
              {idea.suggestedTitle}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 space-y-3">
            <p className="text-sm leading-relaxed text-zinc-400">
              {idea.reasoning}
            </p>

            {idea.basedOn.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Based on
                </p>
                <div className="space-y-1">
                  {idea.basedOn.map((ref) => (
                    <a
                      key={ref.videoId}
                      href={`https://youtube.com/watch?v=${ref.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-blue-400 transition-colors group"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0 text-zinc-600 group-hover:text-blue-400" />
                      <span className="truncate">{ref.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {idea.commonTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {idea.commonTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400 border-zinc-700"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

          </CardContent>

          <CardFooter className="border-t border-zinc-800 pt-4 gap-3 flex-wrap">
            <span className="text-xs text-zinc-500">
              Score:{" "}
              <span className="text-zinc-300 font-medium">
                {idea.avgScore.toFixed(1)}
              </span>
            </span>
            <span className="text-xs text-zinc-500">
              Length:{" "}
              <span className="text-zinc-300 font-medium">
                {idea.optimalLength}
              </span>
            </span>
            <Badge
              variant="outline"
              className={
                COMPETITION_STYLES[idea.competition] || ""
              }
            >
              {idea.competition} competition
            </Badge>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

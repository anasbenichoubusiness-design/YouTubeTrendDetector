"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Lightbulb,
  Image,
  ListOrdered,
  Target,
  MessageSquare,
} from "lucide-react";
import type { AIVideoIdea } from "@/lib/types";

interface AIIdeasPanelProps {
  ideas: AIVideoIdea[];
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      title={`Copy ${label || "text"}`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

function formatBriefAsText(idea: AIVideoIdea): string {
  return `TITLE: ${idea.title}

HOOK (First 30 Seconds):
${idea.hook}

OUTLINE:
${idea.outline.map((s, i) => `${i + 1}. ${s}`).join("\n")}

THUMBNAIL CONCEPT:
${idea.thumbnailConcept}

WHY THIS WILL WORK:
${idea.whyThisWillWork}

UNIQUE ANGLE:
${idea.uniqueAngle}

OPTIMAL LENGTH: ${idea.optimalLength}
TAGS: ${idea.suggestedTags.join(", ")}`;
}

function AIIdeaCard({ idea }: { idea: AIVideoIdea }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
              {idea.id}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 px-1 text-zinc-500 hover:text-zinc-300"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
          <CopyButton text={formatBriefAsText(idea)} label="Copy All" />
        </div>
        <CardTitle className="text-lg leading-snug text-zinc-100 mt-1">
          {idea.title}
          <CopyButton text={idea.title} />
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          {/* Hook */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Hook — First 30 Seconds
              </h4>
              <CopyButton text={idea.hook} />
            </div>
            <p className="text-sm leading-relaxed text-zinc-300 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              {idea.hook}
            </p>
          </section>

          {/* Outline */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <ListOrdered className="h-3.5 w-3.5 text-emerald-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Outline
              </h4>
              <CopyButton text={idea.outline.map((s, i) => `${i + 1}. ${s}`).join("\n")} />
            </div>
            <ol className="space-y-1.5 text-sm text-zinc-300">
              {idea.outline.map((section, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-500 font-mono text-xs mt-0.5 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="leading-relaxed">{section}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Thumbnail Concept */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Image className="h-3.5 w-3.5 text-amber-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Thumbnail Concept
              </h4>
              <CopyButton text={idea.thumbnailConcept} />
            </div>
            <p className="text-sm leading-relaxed text-zinc-300 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              {idea.thumbnailConcept}
            </p>
          </section>

          {/* Why This Will Work */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-3.5 w-3.5 text-red-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Why This Will Work
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              {idea.whyThisWillWork}
            </p>
          </section>

          {/* Unique Angle */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-purple-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Your Unique Angle
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              {idea.uniqueAngle}
            </p>
          </section>

          {/* Footer metadata */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              <span>{idea.optimalLength}</span>
            </div>

            {idea.basedOn.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-zinc-600">Based on:</span>
                {idea.basedOn.slice(0, 3).map((ref) => (
                  <a
                    key={ref.videoId}
                    href={`https://youtube.com/watch?v=${ref.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-400 transition-colors"
                    title={ref.title}
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    <span className="max-w-[120px] truncate">{ref.title}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          {idea.suggestedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {idea.suggestedTags.map((tag) => (
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
      )}
    </Card>
  );
}

export function AIIdeasPanel({ ideas }: AIIdeasPanelProps) {
  if (ideas.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        No AI ideas generated.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ideas.map((idea) => (
        <AIIdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
}

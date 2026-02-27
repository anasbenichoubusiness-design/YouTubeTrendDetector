import type { ScoredVideo, VideoIdea, AIVideoIdea } from "@/lib/types";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function exportVideosToCSV(videos: ScoredVideo[]): void {
  const headers = [
    "Rank",
    "Grade",
    "Score",
    "Title",
    "Channel",
    "Subscribers",
    "Views",
    "Views/Sub",
    "Velocity (/day)",
    "Engagement (%)",
    "Published",
    "Duration",
    "Video URL",
  ];

  const rows = videos.map((v) => [
    String(v.rank),
    v.grade,
    String(v.scores.composite.toFixed(1)),
    escapeCSV(v.snippet.title),
    escapeCSV(v.snippet.channelTitle),
    formatNumber(v.stats.subscriberCount),
    formatNumber(v.stats.viewCount),
    v.scores.viewsToSubRatio.toFixed(2),
    v.scores.velocity.toFixed(1),
    v.scores.engagement.toFixed(2),
    v.snippet.publishedAt.split("T")[0],
    v.snippet.duration,
    `https://youtube.com/watch?v=${v.snippet.videoId}`,
  ]);

  downloadCSV(headers, rows, "outlier-videos");
}

export function exportIdeasToCSV(ideas: VideoIdea[]): void {
  const headers = [
    "#",
    "Type",
    "Suggested Title",
    "Reasoning",
    "Based On",
    "Tags",
    "Avg Score",
    "Optimal Length",
    "Competition",
  ];

  const rows = ideas.map((idea) => [
    String(idea.id),
    idea.type,
    escapeCSV(idea.suggestedTitle),
    escapeCSV(idea.reasoning),
    escapeCSV(idea.basedOn.map((b) => b.title).join("; ")),
    escapeCSV(idea.commonTags.join(", ")),
    String(idea.avgScore.toFixed(1)),
    idea.optimalLength,
    idea.competition,
  ]);

  downloadCSV(headers, rows, "video-ideas");
}

export function exportAIIdeasToCSV(ideas: AIVideoIdea[]): void {
  const headers = [
    "#",
    "Title",
    "Hook",
    "Outline",
    "Thumbnail Concept",
    "Why This Will Work",
    "Unique Angle",
    "Based On",
    "Optimal Length",
    "Tags",
  ];

  const rows = ideas.map((idea) => [
    String(idea.id),
    escapeCSV(idea.title),
    escapeCSV(idea.hook),
    escapeCSV(idea.outline.join(" | ")),
    escapeCSV(idea.thumbnailConcept),
    escapeCSV(idea.whyThisWillWork),
    escapeCSV(idea.uniqueAngle),
    escapeCSV(idea.basedOn.map((b) => b.title).join("; ")),
    idea.optimalLength,
    escapeCSV(idea.suggestedTags.join(", ")),
  ]);

  downloadCSV(headers, rows, "ai-creative-briefs");
}

function downloadCSV(headers: string[], rows: string[][], filename: string): void {
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n"
  );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

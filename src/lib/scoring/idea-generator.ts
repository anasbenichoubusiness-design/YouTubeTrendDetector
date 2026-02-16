import type { ScoredVideo, VideoIdea, IdeaType, CompetitionLevel } from "../types";
import { STOP_WORDS, TITLE_PATTERNS } from "../constants";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractKeywords(titles: string[], topN = 10): string[] {
  const freq = new Map<string, number>();

  for (const title of titles) {
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        seen.add(word);
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function detectTitlePattern(title: string): string[] {
  const patterns: string[] = [];
  for (const [regex, label] of TITLE_PATTERNS) {
    if (regex.test(title)) {
      patterns.push(label);
    }
  }
  return patterns;
}

function formatDurationRange(videos: ScoredVideo[]): string {
  const durations = videos
    .map((v) => {
      const match = v.snippet.duration.match(
        /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
      );
      if (!match) return 0;
      return (
        parseInt(match[1] || "0") * 60 +
        parseInt(match[2] || "0") +
        parseInt(match[3] || "0") / 60
      );
    })
    .filter((d) => d > 0)
    .sort((a, b) => a - b);

  if (durations.length === 0) return "varies";
  if (durations.length === 1) return `~${Math.round(durations[0])} minutes`;

  const p25 = durations[Math.floor(durations.length * 0.25)];
  const p75 = durations[Math.floor(durations.length * 0.75)];
  return `${Math.round(p25)}-${Math.round(p75)} minutes`;
}

function estimateCompetition(videoCount: number): CompetitionLevel {
  if (videoCount <= 3) return "low";
  if (videoCount <= 8) return "medium";
  return "high";
}

// ─── Main Idea Generator ─────────────────────────────────────────────────────

export function generateIdeas(
  videos: ScoredVideo[],
  maxIdeas = 9
): VideoIdea[] {
  if (videos.length === 0) return [];

  const ideas: VideoIdea[] = [];
  let nextId = 1;

  // Strategy 1: Trending Topics (keyword clusters)
  const trendingSlots = Math.ceil(maxIdeas / 3);
  const allTitles = videos.map((v) => v.snippet.title);
  const keywords = extractKeywords(allTitles, trendingSlots * 2);

  for (
    let i = 0;
    i < keywords.length && ideas.length < trendingSlots;
    i++
  ) {
    const keyword = keywords[i];
    const matching = videos.filter((v) =>
      v.snippet.title.toLowerCase().includes(keyword)
    );
    if (matching.length < 2) continue;

    const bestVideo = matching[0];
    const avgScore =
      matching.reduce((s, v) => s + v.scores.composite, 0) / matching.length;
    const allTags = matching.flatMap((v) => v.snippet.tags);
    const tagFreq = new Map<string, number>();
    for (const tag of allTags) {
      tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
    }
    const topTags = [...tagFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);

    const suggestedTitle = `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: ${bestVideo.snippet.title.split(/[-|:]/).pop()?.trim() || "A Complete Guide"}`;

    ideas.push({
      id: nextId++,
      type: "Trending Topic" as IdeaType,
      suggestedTitle,
      reasoning: `"${keyword}" appears in ${matching.length} top-performing videos with an average outlier score of ${avgScore.toFixed(1)}. This keyword signals a trending topic with proven audience demand.`,
      basedOn: matching.slice(0, 3).map((v) => ({
        videoId: v.snippet.videoId,
        title: v.snippet.title,
      })),
      commonTags: topTags,
      avgScore,
      optimalLength: formatDurationRange(matching),
      competition: estimateCompetition(matching.length),
    });
  }

  // Strategy 2: Standout Videos (individual high-scorers)
  const standoutSlots = Math.ceil(maxIdeas / 3);
  const topVideos = videos
    .filter(
      (v) =>
        v.grade === "A+" || v.grade === "A"
    )
    .slice(0, standoutSlots * 2);

  for (
    let i = 0;
    i < topVideos.length && ideas.length < trendingSlots + standoutSlots;
    i++
  ) {
    const video = topVideos[i];
    const patterns = detectTitlePattern(video.snippet.title);
    const pattern = patterns[0] || "Original Angle";

    const suggestedTitle = `Why "${video.snippet.title.split(/[-|:]/)[0].trim()}" Is Taking Off (And How to Capitalize)`;

    ideas.push({
      id: nextId++,
      type: "Standout Video" as IdeaType,
      suggestedTitle,
      reasoning: `This video achieved a ${video.grade} outlier grade (score: ${video.scores.composite.toFixed(1)}) with ${video.stats.viewCount.toLocaleString()} views and a views/sub ratio of ${video.scores.viewsToSubRatio.toFixed(1)}x. Its success as a "${pattern}" suggests a content gap worth exploring.`,
      basedOn: [
        {
          videoId: video.snippet.videoId,
          title: video.snippet.title,
        },
      ],
      commonTags: video.snippet.tags.slice(0, 8),
      avgScore: video.scores.composite,
      optimalLength: formatDurationRange([video]),
      competition: "low",
    });
  }

  // Strategy 3: Winning Formats
  const formatSlots = maxIdeas - ideas.length;
  if (formatSlots > 0) {
    const patternVideoMap = new Map<string, ScoredVideo[]>();
    for (const v of videos) {
      for (const p of detectTitlePattern(v.snippet.title)) {
        if (!patternVideoMap.has(p)) {
          patternVideoMap.set(p, []);
        }
        patternVideoMap.get(p)!.push(v);
      }
    }

    const rankedPatterns = [...patternVideoMap.entries()]
      .map(([pattern, vids]) => ({
        pattern,
        videos: vids,
        score:
          vids.length *
          (vids.reduce((s, v) => s + v.scores.composite, 0) / vids.length),
      }))
      .sort((a, b) => b.score - a.score);

    for (let i = 0; i < Math.min(rankedPatterns.length, formatSlots); i++) {
      const { pattern, videos: patternVideos } = rankedPatterns[i];

      const avgScore =
        patternVideos.reduce((s, v) => s + v.scores.composite, 0) /
        patternVideos.length;

      const allTags = patternVideos.flatMap((v) => v.snippet.tags);
      const tagFreq = new Map<string, number>();
      for (const tag of allTags) {
        tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
      }
      const topTags = [...tagFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([t]) => t);

      ideas.push({
        id: nextId++,
        type: "Winning Format" as IdeaType,
        suggestedTitle: `[${pattern}] ${patternVideos[0].snippet.title.split(/[-|:]/)[0].trim()} — Your Version`,
        reasoning: `The "${pattern}" format appears in ${patternVideos.length} top-performing videos with an average score of ${avgScore.toFixed(1)}. This proven format consistently drives engagement in this niche.`,
        basedOn: patternVideos.slice(0, 3).map((v) => ({
          videoId: v.snippet.videoId,
          title: v.snippet.title,
        })),
        commonTags: topTags,
        avgScore,
        optimalLength: formatDurationRange(patternVideos),
        competition: estimateCompetition(patternVideos.length),
      });
    }
  }

  return ideas.slice(0, maxIdeas);
}

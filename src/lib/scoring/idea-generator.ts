import type { ScoredVideo, VideoIdea, CompetitionLevel } from "../types";
import { STOP_WORDS, TITLE_PATTERNS } from "../constants";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Clean a video title: strip hashtags, extra whitespace, emoji */
function cleanTitle(raw: string): string {
  return raw
    .replace(/#\S+/g, "") // remove hashtags
    .replace(/[\u{1F600}-\u{1F9FF}]/gu, "") // remove emoji
    .replace(/\s{2,}/g, " ") // collapse whitespace
    .trim();
}

/** Naive English stemmer — enough to merge "agent"/"agents", "automate"/"automation" */
function stem(word: string): string {
  return word
    .replace(/ies$/, "y")
    .replace(/tion$/, "t")
    .replace(/(ing|ed|er|ly|ment|ness)$/, "")
    .replace(/(es|s)$/, "")
    .replace(/(.)\1$/, "$1"); // collapse trailing double letter
}

/** Check if two keywords are essentially the same topic */
function areSameTopic(a: string, b: string): boolean {
  // Exact match
  if (a === b) return true;
  // Same stem
  if (stem(a) === stem(b)) return true;
  // One is substring of the other (e.g. "agent" inside "agents" or "automat" inside "automation")
  if (a.length >= 4 && b.length >= 4) {
    if (a.includes(b) || b.includes(a)) return true;
  }
  return false;
}

/** Extract meaningful topic clusters, merging related keywords */
function extractTopicClusters(
  videos: ScoredVideo[],
  maxClusters: number
): { topic: string; videos: ScoredVideo[]; avgScore: number; topVideo: ScoredVideo }[] {
  // Collect keywords per video
  const keywordVideos = new Map<string, Set<number>>();

  for (let idx = 0; idx < videos.length; idx++) {
    const words = cleanTitle(videos[idx].snippet.title)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        seen.add(word);
        if (!keywordVideos.has(word)) keywordVideos.set(word, new Set());
        keywordVideos.get(word)!.add(idx);
      }
    }
  }

  // Score each keyword
  const scored = [...keywordVideos.entries()]
    .filter(([, idxs]) => idxs.size >= 2)
    .map(([keyword, idxs]) => {
      const matchingVideos = [...idxs].map((i) => videos[i]);
      const avgScore =
        matchingVideos.reduce((s, v) => s + v.scores.composite, 0) /
        matchingVideos.length;
      const topVideo = matchingVideos.sort(
        (a, b) => b.scores.composite - a.scores.composite
      )[0];
      return { keyword, idxSet: idxs, avgScore, topVideo };
    })
    // Only keep clusters where the top video is decent
    .filter((entry) => entry.topVideo.scores.composite > 0.3)
    .sort((a, b) => b.avgScore * b.idxSet.size - a.avgScore * a.idxSet.size);

  // Deduplicate: same stem/substring OR >40% video overlap
  const clusters: {
    topic: string;
    videos: ScoredVideo[];
    avgScore: number;
    topVideo: ScoredVideo;
  }[] = [];
  const usedKeywords: string[] = [];
  const usedVideoSets: Set<number>[] = [];

  for (const entry of scored) {
    if (clusters.length >= maxClusters) break;

    // Check keyword similarity with already-used keywords
    const keywordDuplicate = usedKeywords.some((used) =>
      areSameTopic(entry.keyword, used)
    );
    if (keywordDuplicate) continue;

    // Check video overlap with already-used clusters
    const videoDuplicate = usedVideoSets.some((used) => {
      const overlap = [...entry.idxSet].filter((i) => used.has(i)).length;
      return overlap > entry.idxSet.size * 0.4;
    });
    if (videoDuplicate) continue;

    usedKeywords.push(entry.keyword);
    usedVideoSets.push(entry.idxSet);

    const matchingVideos = [...entry.idxSet].map((i) => videos[i]);
    clusters.push({
      topic: entry.keyword,
      videos: matchingVideos,
      avgScore: entry.avgScore,
      topVideo: entry.topVideo,
    });
  }

  return clusters;
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

function collectTags(videos: ScoredVideo[], max = 8): string[] {
  const tagFreq = new Map<string, number>();
  for (const v of videos) {
    for (const tag of v.snippet.tags) {
      tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
    }
  }
  return [...tagFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([t]) => t);
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Main Idea Generator ─────────────────────────────────────────────────────

export function generateIdeas(
  videos: ScoredVideo[],
  maxIdeas = 9
): VideoIdea[] {
  if (videos.length === 0) return [];

  const ideas: VideoIdea[] = [];
  let nextId = 1;
  const usedVideoIds = new Set<string>();

  // ── Strategy 1: Trending Topics (what subjects are outperforming) ──

  const clusters = extractTopicClusters(videos, Math.ceil(maxIdeas / 3));

  for (const cluster of clusters) {
    const bestVideos = cluster.videos
      .sort((a, b) => b.scores.composite - a.scores.composite)
      .slice(0, 3);

    const topTitle = cleanTitle(bestVideos[0].snippet.title);
    const topViews = formatViews(bestVideos[0].stats.viewCount);

    // Detect what format works for this topic
    const formats = bestVideos.flatMap((v) =>
      detectTitlePattern(cleanTitle(v.snippet.title))
    );
    const topFormat = formats.length > 0 ? formats[0] : null;

    const formatHint = topFormat
      ? ` The "${topFormat}" format works well here.`
      : "";

    ideas.push({
      id: nextId++,
      type: "Trending Topic",
      suggestedTitle: `Make a video about "${capitalize(cluster.topic)}" — ${cluster.videos.length} outlier videos prove demand`,
      reasoning: `"${capitalize(cluster.topic)}" is trending in this niche. ${cluster.videos.length} videos feature this topic with an avg outlier score of ${cluster.avgScore.toFixed(1)}. The top performer "${topTitle}" hit ${topViews} views.${formatHint}`,
      basedOn: bestVideos.map((v) => ({
        videoId: v.snippet.videoId,
        title: cleanTitle(v.snippet.title),
      })),
      commonTags: collectTags(cluster.videos),
      avgScore: cluster.avgScore,
      optimalLength: formatDurationRange(cluster.videos),
      competition: estimateCompetition(cluster.videos.length),
    });

    for (const v of bestVideos) usedVideoIds.add(v.snippet.videoId);
  }

  // ── Strategy 2: Standout Videos (individual high-scorers worth replicating) ──

  const standoutSlots = Math.ceil(maxIdeas / 3);
  const topVideos = videos
    .filter(
      (v) =>
        (v.grade === "A+" || v.grade === "A" || v.grade === "B+") &&
        !usedVideoIds.has(v.snippet.videoId)
    )
    .slice(0, standoutSlots * 2);

  for (
    let i = 0;
    i < topVideos.length && ideas.length < clusters.length + standoutSlots;
    i++
  ) {
    const video = topVideos[i];
    const cleanedTitle = cleanTitle(video.snippet.title);
    const patterns = detectTitlePattern(cleanedTitle);
    const pattern = patterns[0] || null;
    const viewsStr = formatViews(video.stats.viewCount);
    const ratio = video.scores.viewsToSubRatio.toFixed(1);

    const formatAdvice = pattern
      ? `Use the "${pattern}" format — it clearly resonates.`
      : `Find your own unique angle on this topic.`;

    ideas.push({
      id: nextId++,
      type: "Standout Video",
      suggestedTitle: `Create your own take on "${cleanedTitle}" — it hit ${viewsStr} views (${ratio}x subs)`,
      reasoning: `This video scored ${video.grade} (${video.scores.composite.toFixed(1)}) with ${viewsStr} views — that's ${ratio}x the channel's subscriber count. ${formatAdvice} Put your unique spin on this angle.`,
      basedOn: [{ videoId: video.snippet.videoId, title: cleanedTitle }],
      commonTags: video.snippet.tags.slice(0, 8),
      avgScore: video.scores.composite,
      optimalLength: formatDurationRange([video]),
      competition: "low",
    });

    usedVideoIds.add(video.snippet.videoId);
  }

  // ── Strategy 3: Winning Formats (title structures that outperform) ──

  const formatSlots = maxIdeas - ideas.length;
  if (formatSlots > 0) {
    const patternVideoMap = new Map<string, ScoredVideo[]>();
    for (const v of videos) {
      const cleaned = cleanTitle(v.snippet.title);
      for (const p of detectTitlePattern(cleaned)) {
        if (!patternVideoMap.has(p)) patternVideoMap.set(p, []);
        patternVideoMap.get(p)!.push(v);
      }
    }

    const rankedPatterns = [...patternVideoMap.entries()]
      .filter(([, vids]) => vids.length >= 2)
      .map(([pattern, vids]) => ({
        pattern,
        videos: vids,
        avgScore:
          vids.reduce((s, v) => s + v.scores.composite, 0) / vids.length,
      }))
      .filter((entry) => entry.avgScore > -0.5)
      .sort((a, b) => b.avgScore - a.avgScore);

    for (let i = 0; i < Math.min(rankedPatterns.length, formatSlots); i++) {
      const { pattern, videos: patternVideos, avgScore } = rankedPatterns[i];

      const bestVid = patternVideos.sort(
        (a, b) => b.scores.composite - a.scores.composite
      )[0];
      const bestTitle = cleanTitle(bestVid.snippet.title);
      const bestViews = formatViews(bestVid.stats.viewCount);

      ideas.push({
        id: nextId++,
        type: "Winning Format",
        suggestedTitle: `Try the "${pattern}" format — ${patternVideos.length} top videos use it (avg score ${avgScore.toFixed(1)})`,
        reasoning: `The "${pattern}" title structure is outperforming in this niche. ${patternVideos.length} videos use it with an average score of ${avgScore.toFixed(1)}. Best example: "${bestTitle}" with ${bestViews} views. Structure your next video this way.`,
        basedOn: patternVideos.slice(0, 3).map((v) => ({
          videoId: v.snippet.videoId,
          title: cleanTitle(v.snippet.title),
        })),
        commonTags: collectTags(patternVideos),
        avgScore,
        optimalLength: formatDurationRange(patternVideos),
        competition: estimateCompetition(patternVideos.length),
      });
    }
  }

  return ideas.slice(0, maxIdeas);
}

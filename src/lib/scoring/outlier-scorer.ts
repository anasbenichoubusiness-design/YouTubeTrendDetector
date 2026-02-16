import type { VideoDetails, ChannelStats, ScoredVideo } from "../types";
import {
  W_VIEWS_SUB,
  W_VELOCITY,
  W_ENGAGEMENT,
  W_VELOCITY_ALT,
  W_ENGAGEMENT_ALT,
  GRADES,
} from "../constants";

// ─── Statistical Helpers ─────────────────────────────────────────────────────

export function computeZScore(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values.map(() => 0);

  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return values.map(() => 0);

  return values.map((v) => {
    const z = (v - mean) / stddev;
    return Math.max(-3, Math.min(3, z));
  });
}

export function assignGrade(score: number): string {
  for (const [threshold, grade] of GRADES) {
    if (score >= threshold) return grade;
  }
  return "C";
}

// ─── Filters ─────────────────────────────────────────────────────────────────

interface ScoringFilters {
  minViews: number;
  maxChannelSubs: number;
  publishedAfterDays: number;
  includeShorts: boolean;
  topN: number;
}

// ─── Enriched internal type ──────────────────────────────────────────────────

interface EnrichedVideo extends VideoDetails {
  channel_title: string;
  channel_subscribers: number;
  hidden_subs: boolean;
  days_since_published: number;
  velocity: number;
  engagement_rate: number;
  views_sub_ratio: number | null;
  thumbnail_url: string;
}

// ─── Main Scoring Function ───────────────────────────────────────────────────

export function scoreVideos(
  videos: VideoDetails[],
  channels: Record<string, ChannelStats>,
  filters: ScoringFilters
): ScoredVideo[] {
  const now = Date.now();
  const cutoffDate = new Date(
    now - filters.publishedAfterDays * 24 * 60 * 60 * 1000
  );

  // Step 1: Filter and enrich
  const enriched: EnrichedVideo[] = [];

  for (const video of videos) {
    if (video.view_count < filters.minViews) continue;

    const publishedDate = new Date(video.published_at);
    if (publishedDate < cutoffDate) continue;

    if (!filters.includeShorts && video.is_short) continue;

    const channel = channels[video.channel_id];
    if (!channel) continue;

    const hiddenSubs = channel.hidden_subscriber_count;
    if (
      !hiddenSubs &&
      filters.maxChannelSubs > 0 &&
      channel.subscriber_count > filters.maxChannelSubs
    ) {
      continue;
    }

    const daysSincePublished = Math.max(
      (now - publishedDate.getTime()) / (1000 * 60 * 60 * 24),
      0
    );

    const velocity = video.view_count / Math.max(daysSincePublished, 0.5);

    const engagement_rate =
      (video.like_count + video.comment_count) / Math.max(video.view_count, 1);

    const views_sub_ratio =
      !hiddenSubs && channel.subscriber_count > 0
        ? video.view_count / channel.subscriber_count
        : null;

    enriched.push({
      ...video,
      channel_title: channel.channel_title,
      channel_subscribers: channel.subscriber_count,
      hidden_subs: hiddenSubs,
      days_since_published: daysSincePublished,
      velocity,
      engagement_rate,
      views_sub_ratio,
      thumbnail_url: "",
    });
  }

  if (enriched.length === 0) return [];

  // Step 2: Z-scores
  const velocityValues = enriched.map((v) => v.velocity);
  const velocityZScores = computeZScore(velocityValues);

  const engagementValues = enriched.map((v) => v.engagement_rate);
  const engagementZScores = computeZScore(engagementValues);

  const vsrIndices: number[] = [];
  const vsrValues: number[] = [];
  for (let i = 0; i < enriched.length; i++) {
    if (enriched[i].views_sub_ratio !== null) {
      vsrIndices.push(i);
      vsrValues.push(enriched[i].views_sub_ratio as number);
    }
  }
  const vsrZScores = computeZScore(vsrValues);

  const vsrZScoreMap = new Map<number, number>();
  for (let j = 0; j < vsrIndices.length; j++) {
    vsrZScoreMap.set(vsrIndices[j], vsrZScores[j]);
  }

  // Step 3: Composite score and build nested ScoredVideo
  const scored: (ScoredVideo & { _composite: number })[] = enriched.map(
    (video, i) => {
      const velZ = velocityZScores[i];
      const engZ = engagementZScores[i];
      const vsrZ = vsrZScoreMap.has(i) ? vsrZScoreMap.get(i)! : null;

      let compositeScore: number;
      if (vsrZ !== null) {
        compositeScore =
          W_VIEWS_SUB * vsrZ + W_VELOCITY * velZ + W_ENGAGEMENT * engZ;
      } else {
        compositeScore = W_VELOCITY_ALT * velZ + W_ENGAGEMENT_ALT * engZ;
      }

      return {
        rank: 0,
        grade: assignGrade(compositeScore),
        snippet: {
          videoId: video.video_id,
          title: video.title,
          channelId: video.channel_id,
          channelTitle: video.channel_title,
          publishedAt: video.published_at,
          thumbnailUrl: video.thumbnail_url,
          description: "",
          tags: video.tags,
          duration: video.duration,
        },
        stats: {
          viewCount: video.view_count,
          likeCount: video.like_count,
          commentCount: video.comment_count,
          subscriberCount: video.channel_subscribers,
        },
        scores: {
          viewsToSubRatio: video.views_sub_ratio ?? 0,
          velocity: video.velocity,
          engagement: video.engagement_rate * 100, // as percentage
          composite: compositeScore,
        },
        _composite: compositeScore,
      };
    }
  );

  // Step 4: Sort and rank
  scored.sort((a, b) => b._composite - a._composite);

  const topN = scored.slice(0, filters.topN);
  return topN.map((v, i) => {
    const { _composite, ...rest } = v;
    return { ...rest, rank: i + 1 };
  });
}

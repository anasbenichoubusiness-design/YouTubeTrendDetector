import type { VideoDetails } from "../types";
import { parseDuration } from "./parse-duration";

const YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

interface FetchVideoDetailsParams {
  apiKey: string;
  videoIds: string[];
}

/**
 * Fetch full video details (snippet, statistics, contentDetails) for a list of
 * video IDs. Batches into groups of 50 to stay within API limits.
 *
 * Each batch costs 1 quota unit (videos.list).
 */
export async function fetchVideoDetails(
  params: FetchVideoDetailsParams
): Promise<VideoDetails[]> {
  const { apiKey, videoIds } = params;

  if (videoIds.length === 0) return [];

  const results: VideoDetails[] = [];

  // Process in batches of 50
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);

    const url = new URL(YT_VIDEOS_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", batch.join(","));

    const res = await fetch(url.toString());

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const message =
        errorBody?.error?.message || `YouTube API error: ${res.status}`;
      throw new Error(message);
    }

    const data = await res.json();

    for (const item of data.items ?? []) {
      const durationISO: string = item.contentDetails?.duration ?? "PT0S";
      const durationSeconds = parseDuration(durationISO);

      results.push({
        video_id: item.id ?? "",
        channel_id: item.snippet?.channelId ?? "",
        title: item.snippet?.title ?? "",
        published_at: item.snippet?.publishedAt ?? "",
        view_count: parseInt(item.statistics?.viewCount ?? "0", 10),
        like_count: parseInt(item.statistics?.likeCount ?? "0", 10),
        comment_count: parseInt(item.statistics?.commentCount ?? "0", 10),
        duration: durationISO,
        duration_seconds: durationSeconds,
        is_short: durationSeconds > 0 && durationSeconds <= 60,
        tags: item.snippet?.tags ?? [],
        category_id: item.snippet?.categoryId ?? "",
        default_language: item.snippet?.defaultLanguage ?? "",
      });
    }
  }

  return results;
}

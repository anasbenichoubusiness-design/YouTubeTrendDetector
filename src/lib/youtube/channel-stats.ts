import type { ChannelStats } from "../types";

const YT_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";

interface FetchChannelStatsParams {
  apiKey: string;
  channelIds: string[];
}

/**
 * Fetch channel statistics for a list of channel IDs.
 *
 * - Deduplicates input IDs.
 * - Batches into groups of 50.
 * - Returns a dict mapping channel_id -> ChannelStats.
 * - If a channel has hiddenSubscriberCount, subscriber_count is set to -1.
 */
export async function fetchChannelStats(
  params: FetchChannelStatsParams
): Promise<Record<string, ChannelStats>> {
  const { apiKey, channelIds } = params;

  // Deduplicate
  const uniqueIds = [...new Set(channelIds)];
  if (uniqueIds.length === 0) return {};

  const result: Record<string, ChannelStats> = {};

  // Process in batches of 50
  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batch = uniqueIds.slice(i, i + 50);

    const url = new URL(YT_CHANNELS_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("part", "snippet,statistics");
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
      const channelId: string = item.id ?? "";
      const stats = item.statistics ?? {};
      const isHidden: boolean = stats.hiddenSubscriberCount === true;

      result[channelId] = {
        channel_id: channelId,
        channel_title: item.snippet?.title ?? "",
        subscriber_count: isHidden
          ? -1
          : parseInt(stats.subscriberCount ?? "0", 10),
        total_views: parseInt(stats.viewCount ?? "0", 10),
        video_count: parseInt(stats.videoCount ?? "0", 10),
        hidden_subscriber_count: isHidden,
      };
    }
  }

  return result;
}

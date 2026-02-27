import type { ChannelInfo } from "../types";

const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YT_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";

/**
 * Resolve a channel input (URL, handle, or ID) to a channel ID.
 *
 * Supports:
 * - https://youtube.com/@handle
 * - https://youtube.com/channel/UCxxxxxx
 * - @handle
 * - UCxxxxxx (raw ID)
 */
export async function resolveChannelId(
  input: string,
  apiKey: string
): Promise<string> {
  const trimmed = input.trim();

  // Direct channel ID
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return trimmed;
  }

  // Extract handle from URL or raw handle
  let handle: string | null = null;

  const handleMatch = trimmed.match(/@([\w.-]+)/);
  if (handleMatch) {
    handle = handleMatch[1];
  }

  // Extract channel ID from URL
  const channelIdMatch = trimmed.match(/\/channel\/(UC[\w-]{22})/);
  if (channelIdMatch) {
    return channelIdMatch[1];
  }

  // Resolve handle via search
  if (handle) {
    const url = new URL(YT_CHANNELS_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("part", "id");
    url.searchParams.set("forHandle", handle);

    const res = await fetch(url.toString());
    if (res.ok) {
      const data = await res.json();
      if (data.items?.[0]?.id) {
        return data.items[0].id;
      }
    }
  }

  // Fallback: try as a search query for the channel
  const searchUrl = new URL(YT_SEARCH_URL);
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("q", trimmed);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "channel");
  searchUrl.searchParams.set("maxResults", "1");

  const searchRes = await fetch(searchUrl.toString());
  if (searchRes.ok) {
    const data = await searchRes.json();
    const channelId = data.items?.[0]?.id?.channelId;
    if (channelId) return channelId;
  }

  throw new Error("Could not resolve channel. Try a direct channel URL or @handle.");
}

/**
 * Fetch channel info (name, subs, etc.)
 */
export async function fetchChannelInfo(
  channelId: string,
  apiKey: string
): Promise<ChannelInfo> {
  const url = new URL(YT_CHANNELS_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", channelId);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error("Channel not found.");

  return {
    channelId: item.id,
    title: item.snippet?.title ?? "",
    subscriberCount: parseInt(item.statistics?.subscriberCount ?? "0", 10),
    totalViews: parseInt(item.statistics?.viewCount ?? "0", 10),
    videoCount: parseInt(item.statistics?.videoCount ?? "0", 10),
    thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? "",
  };
}

/**
 * Fetch recent video IDs from a channel (up to 50).
 */
export async function fetchChannelVideoIds(
  channelId: string,
  apiKey: string
): Promise<{ videoIds: string[]; quotaUsed: number }> {
  const url = new URL(YT_SEARCH_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("part", "id");
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  const videoIds = (data.items ?? [])
    .map((item: { id?: { videoId?: string } }) => item.id?.videoId)
    .filter(Boolean) as string[];

  return { videoIds, quotaUsed: 100 };
}

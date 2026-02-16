import type { SearchResult } from "../types";

const YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

interface SearchParams {
  apiKey: string;
  query: string;
  maxPages: number;
  publishedAfterDays: number;
  order?: string;
  regionCode?: string;
  language?: string;
}

interface SearchResponse {
  videos: SearchResult[];
  pagesFetched: number;
  quotaUsed: number;
}

/**
 * Search YouTube for videos matching a query.
 *
 * - Paginates via nextPageToken (max 50 results per page).
 * - Deduplicates by video_id across pages.
 * - Each page costs 100 quota units.
 */
export async function searchYouTube(params: SearchParams): Promise<SearchResponse> {
  const {
    apiKey,
    query,
    maxPages,
    publishedAfterDays,
    order = "relevance",
    regionCode,
    language,
  } = params;

  // Compute publishedAfter as RFC 3339 timestamp
  const publishedAfter = new Date(
    Date.now() - publishedAfterDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const seen = new Set<string>();
  const videos: SearchResult[] = [];
  let nextPageToken: string | undefined;
  let pagesFetched = 0;
  let quotaUsed = 0;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(YT_SEARCH_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", query);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("order", order);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("publishedAfter", publishedAfter);

    if (regionCode) {
      url.searchParams.set("regionCode", regionCode);
    }
    if (language) {
      url.searchParams.set("relevanceLanguage", language);
    }
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const res = await fetch(url.toString());
    quotaUsed += 100; // search.list costs 100 quota units per call

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const message =
        errorBody?.error?.message || `YouTube API error: ${res.status}`;
      throw new Error(message);
    }

    const data = await res.json();
    pagesFetched++;

    // Extract results, deduplicating
    for (const item of data.items ?? []) {
      const videoId: string = item.id?.videoId;
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);

      videos.push({
        video_id: videoId,
        channel_id: item.snippet?.channelId ?? "",
        title: item.snippet?.title ?? "",
        description: item.snippet?.description ?? "",
        published_at: item.snippet?.publishedAt ?? "",
        thumbnail_url:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.default?.url ??
          "",
      });
    }

    // Check if there are more pages
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break;
  }

  return { videos, pagesFetched, quotaUsed };
}

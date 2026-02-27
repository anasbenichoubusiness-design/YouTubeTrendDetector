import { NextRequest, NextResponse } from "next/server";
import { searchYouTube } from "@/lib/youtube/search";
import { fetchVideoDetails } from "@/lib/youtube/video-details";
import { fetchChannelStats } from "@/lib/youtube/channel-stats";
import { scoreVideos } from "@/lib/scoring/outlier-scorer";
import { generateIdeas } from "@/lib/scoring/idea-generator";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();

    // Use server env var as fallback for API key
    const apiKey = body.apiKey?.trim() || process.env.YT_API_KEY || "";

    // Validate required fields
    if (!body.niche?.trim()) {
      return NextResponse.json(
        { error: "Niche/topic is required" },
        { status: 400 }
      );
    }
    if (!apiKey) {
      return NextResponse.json(
        { error: "YouTube API key is required" },
        { status: 400 }
      );
    }

    const maxPages = body.maxPages ?? 3;
    const publishedWithinDays = body.publishedWithinDays ?? 14;
    const minViews = body.minViews ?? 1000;
    const includeShorts = body.includeShorts ?? false;

    // Multi-region support: use regions array, fall back to single region
    const regions =
      body.regions && body.regions.length > 0
        ? body.regions
        : [body.region ?? "US"];

    // Scale pages per region to keep quota reasonable
    const pagesPerRegion =
      regions.length === 1
        ? maxPages
        : Math.max(1, Math.ceil(maxPages / regions.length));

    let totalQuota = 0;

    // Step 1: Search YouTube across all regions in parallel
    const searchResults = await Promise.all(
      regions.map((regionCode) =>
        searchYouTube({
          apiKey,
          query: body.niche,
          maxPages: pagesPerRegion,
          publishedAfterDays: publishedWithinDays,
          regionCode,
          language: "en",
        })
      )
    );

    // Merge and deduplicate across regions
    const seen = new Set<string>();
    const mergedVideos: { video_id: string; channel_id: string; title: string; description: string; published_at: string; thumbnail_url: string }[] = [];

    for (const result of searchResults) {
      totalQuota += result.quotaUsed;
      for (const video of result.videos) {
        if (!seen.has(video.video_id)) {
          seen.add(video.video_id);
          mergedVideos.push(video);
        }
      }
    }

    if (mergedVideos.length === 0) {
      return NextResponse.json(
        { error: "No videos found for this niche. Try different keywords or expand the date range." },
        { status: 404 }
      );
    }

    // Step 2: Fetch video details
    const videoIds = mergedVideos.map((v) => v.video_id);
    const videoDetails = await fetchVideoDetails({
      apiKey,
      videoIds,
    });
    totalQuota += Math.ceil(videoIds.length / 50); // 1 quota per batch of 50

    // Step 3: Fetch channel stats
    const channelIds = [...new Set(videoDetails.map((v) => v.channel_id))];
    const channelStats = await fetchChannelStats({
      apiKey,
      channelIds,
    });
    totalQuota += Math.ceil(channelIds.length / 50);

    // Build thumbnail map from search results
    const thumbMap = new Map<string, string>();
    for (const v of mergedVideos) {
      if (v.thumbnail_url) thumbMap.set(v.video_id, v.thumbnail_url);
    }

    // Step 4: Score outliers
    const scoredVideos = scoreVideos(videoDetails, channelStats, {
      minViews,
      maxChannelSubs: 0, // no cap
      publishedAfterDays: publishedWithinDays,
      includeShorts,
      topN: 50,
    });

    // Patch thumbnail URLs from search results
    for (const v of scoredVideos) {
      if (!v.snippet.thumbnailUrl) {
        v.snippet.thumbnailUrl = thumbMap.get(v.snippet.videoId) ?? "";
      }
    }

    // Step 5: Generate ideas
    const ideas = generateIdeas(scoredVideos, 9);

    const response: AnalyzeResponse = {
      videos: scoredVideos,
      ideas,
      quotaUsed: totalQuota,
      query: body.niche,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";

    // Check for common YouTube API errors
    if (message.includes("quotaExceeded")) {
      return NextResponse.json(
        { error: "YouTube API quota exceeded. Try again tomorrow or use a different API key." },
        { status: 429 }
      );
    }
    if (message.includes("keyInvalid") || message.includes("API key not valid")) {
      return NextResponse.json(
        { error: "Invalid YouTube API key. Check your key in Settings." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

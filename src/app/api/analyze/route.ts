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

    // Validate required fields
    if (!body.niche?.trim()) {
      return NextResponse.json(
        { error: "Niche/topic is required" },
        { status: 400 }
      );
    }
    if (!body.apiKey?.trim()) {
      return NextResponse.json(
        { error: "YouTube API key is required" },
        { status: 400 }
      );
    }

    const maxPages = body.maxPages ?? 3;
    const publishedWithinDays = body.publishedWithinDays ?? 14;
    const minViews = body.minViews ?? 1000;
    const region = body.region ?? "US";
    const includeShorts = body.includeShorts ?? true;

    let totalQuota = 0;

    // Step 1: Search YouTube
    const searchResult = await searchYouTube({
      apiKey: body.apiKey,
      query: body.niche,
      maxPages,
      publishedAfterDays: publishedWithinDays,
      regionCode: region,
    });
    totalQuota += searchResult.quotaUsed;

    if (searchResult.videos.length === 0) {
      return NextResponse.json(
        { error: "No videos found for this niche. Try different keywords or expand the date range." },
        { status: 404 }
      );
    }

    // Step 2: Fetch video details
    const videoIds = searchResult.videos.map((v) => v.video_id);
    const videoDetails = await fetchVideoDetails({
      apiKey: body.apiKey,
      videoIds,
    });
    totalQuota += Math.ceil(videoIds.length / 50); // 1 quota per batch of 50

    // Step 3: Fetch channel stats
    const channelIds = [...new Set(videoDetails.map((v) => v.channel_id))];
    const channelStats = await fetchChannelStats({
      apiKey: body.apiKey,
      channelIds,
    });
    totalQuota += Math.ceil(channelIds.length / 50);

    // Step 4: Score outliers
    const scoredVideos = scoreVideos(videoDetails, channelStats, {
      minViews,
      maxChannelSubs: 0, // no cap
      publishedAfterDays: publishedWithinDays,
      includeShorts,
      topN: 50,
    });

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

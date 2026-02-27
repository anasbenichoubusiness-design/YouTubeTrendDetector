import { NextRequest, NextResponse } from "next/server";
import {
  resolveChannelId,
  fetchChannelInfo,
  fetchChannelVideoIds,
} from "@/lib/youtube/channel-videos";
import { fetchVideoDetails } from "@/lib/youtube/video-details";
import { scoreVideos } from "@/lib/scoring/outlier-scorer";
import type { ChannelSpyRequest, ChannelSpyResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: ChannelSpyRequest = await request.json();

    if (!body.channelInput?.trim()) {
      return NextResponse.json(
        { error: "Channel URL or handle is required." },
        { status: 400 }
      );
    }
    if (!body.apiKey?.trim()) {
      return NextResponse.json(
        { error: "YouTube API key is required." },
        { status: 400 }
      );
    }

    let totalQuota = 0;

    // Step 1: Resolve channel ID
    const channelId = await resolveChannelId(body.channelInput, body.apiKey);
    totalQuota += 1; // channels.list or search.list

    // Step 2: Fetch channel info
    const channelInfo = await fetchChannelInfo(channelId, body.apiKey);
    totalQuota += 1;

    // Step 3: Fetch recent video IDs
    const { videoIds, quotaUsed: searchQuota } = await fetchChannelVideoIds(
      channelId,
      body.apiKey
    );
    totalQuota += searchQuota;

    if (videoIds.length === 0) {
      return NextResponse.json(
        { error: "No videos found for this channel." },
        { status: 404 }
      );
    }

    // Step 4: Fetch video details
    const videoDetails = await fetchVideoDetails({
      apiKey: body.apiKey,
      videoIds,
    });
    totalQuota += Math.ceil(videoIds.length / 50);

    // Step 5: Score videos against each other (channel-relative)
    // Use the channel's own stats as the only channel
    const channelStats = {
      [channelId]: {
        channel_id: channelId,
        channel_title: channelInfo.title,
        subscriber_count: channelInfo.subscriberCount,
        total_views: channelInfo.totalViews,
        video_count: channelInfo.videoCount,
        hidden_subscriber_count: channelInfo.subscriberCount <= 0,
      },
    };

    const scoredVideos = scoreVideos(videoDetails, channelStats, {
      minViews: 0,
      maxChannelSubs: 0,
      publishedAfterDays: 365, // last year of videos
      includeShorts: true,
      topN: 50,
    });

    const response: ChannelSpyResponse = {
      channel: channelInfo,
      videos: scoredVideos,
      quotaUsed: totalQuota,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to analyze channel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

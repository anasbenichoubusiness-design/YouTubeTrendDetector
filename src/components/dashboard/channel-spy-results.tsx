"use client";

import { Card, CardContent } from "@/components/ui/card";
import { OutlierTable } from "./outlier-table";
import type { ChannelSpyResponse } from "@/lib/types";

interface ChannelSpyResultsProps {
  data: ChannelSpyResponse;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function ChannelSpyResults({ data }: ChannelSpyResultsProps) {
  const { channel, videos, quotaUsed } = data;
  const outliers = videos.filter(
    (v) => v.grade === "A+" || v.grade === "A"
  ).length;

  return (
    <div className="space-y-4">
      {/* Channel Header */}
      <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        {channel.thumbnailUrl && (
          <img
            src={channel.thumbnailUrl}
            alt={channel.title}
            className="h-12 w-12 rounded-full"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-zinc-100 truncate">
            {channel.title}
          </h3>
          <div className="flex gap-4 mt-1 text-xs text-zinc-500">
            <span>{formatNum(channel.subscriberCount)} subscribers</span>
            <span>{formatNum(channel.totalViews)} total views</span>
            <span>{channel.videoCount} videos</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Videos Analyzed
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">
              {videos.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Outliers
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">
              {outliers}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Avg Views
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">
              {videos.length > 0
                ? formatNum(
                    Math.round(
                      videos.reduce((s, v) => s + v.stats.viewCount, 0) /
                        videos.length
                    )
                  )
                : "0"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Quota Used
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-100">
              {quotaUsed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Video Table */}
      <OutlierTable videos={videos} />
    </div>
  );
}

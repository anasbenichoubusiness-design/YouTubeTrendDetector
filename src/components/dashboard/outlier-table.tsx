"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GradeBadge } from "./grade-badge";
import { ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from "lucide-react";
import type { ScoredVideo } from "@/lib/types";

interface OutlierTableProps {
  videos: ScoredVideo[];
}

type SortKey =
  | "rank"
  | "grade"
  | "composite"
  | "title"
  | "channel"
  | "subscriberCount"
  | "viewCount"
  | "viewsToSubRatio"
  | "velocity"
  | "engagement"
  | "publishedAt"
  | "duration";

type SortDir = "asc" | "desc";

const GRADE_ORDER: Record<string, number> = {
  "A+": 0,
  A: 1,
  "B+": 2,
  B: 3,
  C: 4,
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? match[1] + ":" : "";
  const m = match[2] ? match[2].padStart(h ? 2 : 1, "0") : "0";
  const s = match[3] ? match[3].padStart(2, "0") : "00";
  return h + m + ":" + s;
}

function getSortValue(video: ScoredVideo, key: SortKey): number | string {
  switch (key) {
    case "rank":
      return video.rank;
    case "grade":
      return GRADE_ORDER[video.grade] ?? 99;
    case "composite":
      return video.scores.composite;
    case "title":
      return video.snippet.title.toLowerCase();
    case "channel":
      return video.snippet.channelTitle.toLowerCase();
    case "subscriberCount":
      return video.stats.subscriberCount;
    case "viewCount":
      return video.stats.viewCount;
    case "viewsToSubRatio":
      return video.scores.viewsToSubRatio;
    case "velocity":
      return video.scores.velocity;
    case "engagement":
      return video.scores.engagement;
    case "publishedAt":
      return new Date(video.snippet.publishedAt).getTime();
    case "duration":
      return video.snippet.duration;
  }
}

interface ColumnDef {
  key: SortKey;
  label: string;
  hideOnMobile?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: "rank", label: "#" },
  { key: "grade", label: "Grade" },
  { key: "composite", label: "Score" },
  { key: "title", label: "Title" },
  { key: "channel", label: "Channel", hideOnMobile: true },
  { key: "subscriberCount", label: "Subs", hideOnMobile: true },
  { key: "viewCount", label: "Views" },
  { key: "viewsToSubRatio", label: "V/S", hideOnMobile: true },
  { key: "velocity", label: "Vel.", hideOnMobile: true },
  { key: "engagement", label: "Eng.", hideOnMobile: true },
  { key: "publishedAt", label: "Published", hideOnMobile: true },
  { key: "duration", label: "Dur.", hideOnMobile: true },
];

export function OutlierTable({ videos }: OutlierTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    const copy = [...videos];
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      let cmp: number;
      if (typeof aVal === "string" && typeof bVal === "string") {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [videos, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  function SortIcon({ columnKey }: { columnKey: SortKey }) {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-zinc-600" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3 text-zinc-300" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3 text-zinc-300" />
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 hover:bg-transparent">
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={`cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-200 transition-colors ${
                  col.hideOnMobile ? "hidden lg:table-cell" : ""
                }`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                <SortIcon columnKey={col.key} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((video) => (
            <TableRow
              key={video.snippet.videoId}
              className="border-zinc-800/50 hover:bg-zinc-800/30"
            >
              <TableCell className="text-xs font-mono text-zinc-500 w-8">
                {video.rank}
              </TableCell>
              <TableCell>
                <GradeBadge grade={video.grade} />
              </TableCell>
              <TableCell className="text-sm font-semibold text-zinc-200">
                {video.scores.composite.toFixed(1)}
              </TableCell>
              <TableCell className="max-w-[200px] lg:max-w-[300px]">
                <a
                  href={`https://youtube.com/watch?v=${video.snippet.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1.5 text-sm text-zinc-300 hover:text-blue-400 transition-colors"
                  title={video.snippet.title}
                >
                  <span className="truncate">{video.snippet.title}</span>
                  <ExternalLink className="hidden h-3 w-3 shrink-0 text-zinc-600 group-hover:inline group-hover:text-blue-400" />
                </a>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-zinc-400 max-w-[120px] truncate">
                {video.snippet.channelTitle}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-zinc-400 font-mono">
                {formatNum(video.stats.subscriberCount)}
              </TableCell>
              <TableCell className="text-sm text-zinc-300 font-mono">
                {formatNum(video.stats.viewCount)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-zinc-400 font-mono">
                {video.scores.viewsToSubRatio.toFixed(1)}x
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-zinc-400 font-mono">
                {formatNum(Math.round(video.scores.velocity))}/d
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-zinc-400 font-mono">
                {video.scores.engagement.toFixed(1)}%
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-zinc-500 whitespace-nowrap">
                {formatDate(video.snippet.publishedAt)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-zinc-500 font-mono">
                {parseDuration(video.snippet.duration)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

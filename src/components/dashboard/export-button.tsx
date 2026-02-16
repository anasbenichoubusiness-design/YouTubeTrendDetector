"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportVideosToCSV, exportIdeasToCSV } from "@/lib/csv-export";
import type { ScoredVideo, VideoIdea } from "@/lib/types";

interface ExportButtonProps {
  videos?: ScoredVideo[];
  ideas?: VideoIdea[];
  activeTab: string;
}

export function ExportButton({ videos, ideas, activeTab }: ExportButtonProps) {
  function handleExport() {
    if (activeTab === "outliers" && videos && videos.length > 0) {
      exportVideosToCSV(videos);
    } else if (activeTab === "ideas" && ideas && ideas.length > 0) {
      exportIdeasToCSV(ideas);
    }
  }

  const hasData =
    (activeTab === "outliers" && videos && videos.length > 0) ||
    (activeTab === "ideas" && ideas && ideas.length > 0);

  if (!hasData) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}

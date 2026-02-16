import { Card, CardContent } from "@/components/ui/card";
import type { ScoredVideo } from "@/lib/types";

interface StatsSummaryProps {
  videos: ScoredVideo[];
  quotaUsed: number;
}

const GRADE_ORDER = ["A+", "A", "B+", "B", "C"];

function getTopGrade(videos: ScoredVideo[]): string {
  if (videos.length === 0) return "-";
  let best = "C";
  for (const v of videos) {
    if (GRADE_ORDER.indexOf(v.grade) < GRADE_ORDER.indexOf(best)) {
      best = v.grade;
    }
  }
  return best;
}

function getOutlierCount(videos: ScoredVideo[]): number {
  return videos.filter((v) => v.grade === "A+" || v.grade === "A").length;
}

function getAvgScore(videos: ScoredVideo[]): string {
  if (videos.length === 0) return "0";
  const sum = videos.reduce((acc, v) => acc + v.scores.composite, 0);
  return (sum / videos.length).toFixed(1);
}

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
}

function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p>
        {detail && (
          <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsSummary({ videos, quotaUsed }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Videos Analyzed"
        value={videos.length}
        detail="matching results"
      />
      <StatCard
        label="Outliers Found"
        value={getOutlierCount(videos)}
        detail="grade A+ or A"
      />
      <StatCard
        label="Top Grade"
        value={getTopGrade(videos)}
        detail="best performing"
      />
      <StatCard
        label="Avg Score"
        value={getAvgScore(videos)}
        detail="composite score"
      />
      <StatCard
        label="Quota Used"
        value={quotaUsed.toLocaleString()}
        detail="API units"
      />
    </div>
  );
}

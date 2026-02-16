import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GradeBadgeProps {
  grade: string;
}

const gradeStyles: Record<string, string> = {
  "A+": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  A: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "B+": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  B: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  C: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export function GradeBadge({ grade }: GradeBadgeProps) {
  const style = gradeStyles[grade] || gradeStyles["C"];

  return (
    <Badge
      variant="outline"
      className={cn("font-bold text-xs px-2 py-0.5", style)}
    >
      {grade}
    </Badge>
  );
}

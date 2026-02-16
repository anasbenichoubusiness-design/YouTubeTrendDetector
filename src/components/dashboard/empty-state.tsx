import { Search } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50 mb-6">
        <Search className="h-7 w-7 text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">
        No analysis yet
      </h3>
      <p className="max-w-sm text-center text-sm leading-relaxed text-zinc-500">
        Enter a niche or topic above to discover outlier videos and generate
        content ideas. The analysis will search YouTube, score videos by
        performance, and surface opportunities.
      </p>
    </div>
  );
}

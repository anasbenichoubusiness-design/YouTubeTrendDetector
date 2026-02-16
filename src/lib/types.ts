// ─── Search Result (from YouTube search API) ────────────────────────────────

export interface SearchResult {
  video_id: string;
  channel_id: string;
  title: string;
  description: string;
  published_at: string;
  thumbnail_url: string;
}

// ─── Video Details (from YouTube videos API) ─────────────────────────────────

export interface VideoDetails {
  video_id: string;
  channel_id: string;
  title: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: string; // ISO 8601 e.g. "PT12M30S"
  duration_seconds: number;
  is_short: boolean;
  tags: string[];
  category_id: string;
  default_language: string;
}

// ─── Channel Stats (from YouTube channels API) ──────────────────────────────

export interface ChannelStats {
  channel_id: string;
  channel_title: string;
  subscriber_count: number;
  total_views: number;
  video_count: number;
  hidden_subscriber_count: boolean;
}

// ─── Scored Video (UI-facing, nested structure) ──────────────────────────────

export interface VideoSnippet {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  description: string;
  tags: string[];
  duration: string; // ISO 8601
}

export interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  subscriberCount: number;
}

export interface ScoreBreakdown {
  viewsToSubRatio: number;
  velocity: number; // views per day
  engagement: number; // (likes + comments) / views as percentage
  composite: number; // weighted final score
}

export interface ScoredVideo {
  rank: number;
  grade: string; // "A+", "A", "B+", "B", "C"
  snippet: VideoSnippet;
  stats: VideoStats;
  scores: ScoreBreakdown;
}

// ─── Video Idea Types ────────────────────────────────────────────────────────

export type IdeaType = "Trending Topic" | "Standout Video" | "Winning Format";
export type CompetitionLevel = "low" | "medium" | "high";

export interface VideoIdea {
  id: number;
  type: IdeaType;
  suggestedTitle: string;
  reasoning: string;
  basedOn: {
    videoId: string;
    title: string;
  }[];
  commonTags: string[];
  avgScore: number;
  optimalLength: string; // e.g. "10-15 minutes"
  competition: CompetitionLevel;
}

// ─── API Request / Response ──────────────────────────────────────────────────

export interface AnalyzeRequest {
  niche: string;
  apiKey: string;
  maxPages?: number;
  publishedWithinDays?: number;
  minViews?: number;
  region?: string;
  includeShorts?: boolean;
}

export interface AnalyzeResponse {
  videos: ScoredVideo[];
  ideas: VideoIdea[];
  quotaUsed: number;
  query: string;
  timestamp: string;
}

// ─── Analysis State Machine ──────────────────────────────────────────────────

export type AnalysisStatus = "idle" | "loading" | "success" | "error";

export interface AnalysisStateIdle {
  status: "idle";
}

export interface AnalysisStateLoading {
  status: "loading";
  startedAt: number;
}

export interface AnalysisStateSuccess {
  status: "success";
  data: AnalyzeResponse;
}

export interface AnalysisStateError {
  status: "error";
  error: string;
}

export type AnalysisState =
  | AnalysisStateIdle
  | AnalysisStateLoading
  | AnalysisStateSuccess
  | AnalysisStateError;

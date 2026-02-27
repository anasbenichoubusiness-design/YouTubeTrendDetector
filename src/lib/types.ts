// ─── Web Trends (from Google News RSS) ───────────────────────────────────────

export interface WebTrend {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
}

export interface WebTrendsResponse {
  trends: WebTrend[];
  query: string;
}

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
  regions?: string[];
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

// ─── AI Title Generator ─────────────────────────────────────────────────────

export type AIProvider = "claude" | "openai";

export interface GenerateTitlesRequest {
  aiProvider: AIProvider;
  aiApiKey: string;
  niche: string;
  idea: VideoIdea;
  topVideos: { title: string; score: number; views: number; grade: string }[];
}

export interface GeneratedTitle {
  title: string;
  reasoning: string;
}

export interface GenerateTitlesResponse {
  titles: GeneratedTitle[];
}

// ─── AI Creative Brief Generator ────────────────────────────────────────────

export interface AIVideoIdea {
  id: number;
  title: string;
  hook: string;
  outline: string[];
  thumbnailConcept: string;
  whyThisWillWork: string;
  uniqueAngle: string;
  basedOn: {
    videoId: string;
    title: string;
    views: number;
    grade: string;
  }[];
  optimalLength: string;
  suggestedTags: string[];
}

export interface AIIdeasState {
  status: "idle" | "loading" | "success" | "error";
  ideas: AIVideoIdea[];
  error?: string;
}

export interface GenerateAIIdeasRequest {
  aiProvider: AIProvider;
  aiApiKey: string;
  niche: string;
  topVideos: {
    title: string;
    views: number;
    likes: number;
    comments: number;
    subscriberCount: number;
    viewsToSubRatio: number;
    velocity: number;
    engagement: number;
    composite: number;
    grade: string;
    tags: string[];
    duration: string;
    channelTitle: string;
    videoId: string;
  }[];
  patternAnalysis: {
    pattern: string;
    count: number;
    avgScore: number;
  }[];
  topicClusters: {
    topic: string;
    videoCount: number;
    avgScore: number;
  }[];
}

export interface GenerateAIIdeasResponse {
  ideas: AIVideoIdea[];
}

// ─── Make My Version (single video brief) ───────────────────────────────────

export interface MyVersionBrief {
  title: string;
  hook: string;
  outline: string[];
  thumbnailConcept: string;
  uniqueAngle: string;
  script: string;
  optimalLength: string;
  suggestedTags: string[];
}

export interface MyVersionState {
  status: "idle" | "loading" | "success" | "error";
  brief: MyVersionBrief | null;
  sourceVideo: ScoredVideo | null;
  error?: string;
}

// ─── Channel Spy ────────────────────────────────────────────────────────────

export interface ChannelSpyRequest {
  channelInput: string; // URL, handle, or ID
  apiKey: string;
}

export interface ChannelInfo {
  channelId: string;
  title: string;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  thumbnailUrl: string;
}

export interface ChannelSpyResponse {
  channel: ChannelInfo;
  videos: ScoredVideo[];
  quotaUsed: number;
  timestamp: string;
}

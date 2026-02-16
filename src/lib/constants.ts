// ─── Scoring Weights ─────────────────────────────────────────────────────────

/** Weight for views-to-subscriber ratio z-score (used when subs are known) */
export const W_VIEWS_SUB = 0.45;

/** Weight for velocity z-score (used when subs are known) */
export const W_VELOCITY = 0.30;

/** Weight for engagement z-score (used when subs are known) */
export const W_ENGAGEMENT = 0.25;

/** Alternative velocity weight (used when subscriber count is hidden) */
export const W_VELOCITY_ALT = 0.55;

/** Alternative engagement weight (used when subscriber count is hidden) */
export const W_ENGAGEMENT_ALT = 0.45;

// ─── Grade Thresholds ───────────────────────────────────────────────────────

/**
 * Grade brackets: [minimumScore, gradeLabel]
 * Evaluated top-down — first match wins.
 */
export const GRADES: [number, string][] = [
  [2.0, "A+"],
  [1.5, "A"],
  [1.0, "B+"],
  [0.5, "B"],
  [-Infinity, "C"],
];

// ─── Stop Words ──────────────────────────────────────────────────────────────

export const STOP_WORDS: Set<string> = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "and", "but", "or", "nor", "not", "so", "yet",
  "both", "either", "neither", "each", "every", "all", "any", "few",
  "more", "most", "other", "some", "such", "no", "only", "own", "same",
  "than", "too", "very", "just", "about", "above", "below", "between",
  "this", "that", "these", "those", "i", "me", "my", "we", "you", "your",
  "he", "him", "his", "she", "her", "it", "its", "they", "them", "their",
  "what", "which", "who", "whom", "how", "when", "where", "why", "up",
  "out", "if", "then", "here", "there", "also", "over",
]);

// ─── Title Patterns ──────────────────────────────────────────────────────────

/**
 * Each entry is [regex, humanLabel].
 * Regexes are case-insensitive and tested against the full title string.
 */
export const TITLE_PATTERNS: [RegExp, string][] = [
  [/top\s+\d+/i, "Top N Listicle"],
  [/best\s+\d+/i, "Best N Listicle"],
  [/^\d+\s+/i, "Numbered List"],
  [/i\s+(tried|spent|bought|tested|lived)/i, "Personal Experiment"],
  [/how\s+to/i, "How-To Tutorial"],
  [/\bvs\.?\b|\bversus\b|\bcompared?\b/i, "Comparison / Versus"],
  [/beginner|beginners|starting|started|from\s+zero/i, "Beginner-Focused"],
  [/20\d{2}/i, "Year-Tagged"],
  [/review/i, "Review"],
  [/tutorial|step[\s-]by[\s-]step|guide/i, "Tutorial"],
  [/why\s+(you|i|we|most|nobody|everybody|everyone)/i, "Why / Explanation"],
  [/don'?t|stop|never|worst|mistake|avoid|wrong/i, "Negative Framing"],
];

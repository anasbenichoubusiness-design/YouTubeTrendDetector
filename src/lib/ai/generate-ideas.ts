import type { GenerateAIIdeasRequest, AIVideoIdea } from "../types";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}

function buildPrompt(req: GenerateAIIdeasRequest): string {
  const videos = req.topVideos.slice(0, 50);
  const videoList = videos
    .map(
      (v, i) =>
        `${i + 1}. "${v.title}" by ${v.channelTitle}\n   Grade: ${v.grade} | Score: ${v.composite.toFixed(2)} | Views: ${formatNumber(v.views)} | Velocity: ${v.velocity.toFixed(0)} views/day | Engagement: ${(v.engagement * 100).toFixed(1)}% | Subs: ${formatNumber(v.subscriberCount)} | Views/Sub: ${v.viewsToSubRatio.toFixed(1)}x | Tags: ${v.tags.slice(0, 5).join(", ") || "none"}`
    )
    .join("\n");

  const patternList =
    req.patternAnalysis.length > 0
      ? req.patternAnalysis
          .map(
            (p) =>
              `- "${p.pattern}" — ${p.count} videos use this, avg score ${p.avgScore.toFixed(2)}`
          )
          .join("\n")
      : "No clear dominant patterns detected.";

  const clusterList =
    req.topicClusters.length > 0
      ? req.topicClusters
          .map(
            (c) =>
              `- "${c.topic}" — ${c.videoCount} videos, avg score ${c.avgScore.toFixed(2)}`
          )
          .join("\n")
      : "No clear topic clusters detected.";

  const today = new Date().toISOString().split("T")[0];

  return `You are an elite YouTube content strategist. You combine data analysis with creative storytelling to generate video ideas that creators can execute immediately.

## Important Context
Today's date is ${today}. All video ideas MUST be relevant to the current time. Never reference past years in titles or content. Everything should feel fresh and timely for ${new Date().getFullYear()}.

## Task
Analyze ALL ${videos.length} trending videos below in the "${req.niche}" niche. You MUST generate at LEAST ${Math.max(10, Math.ceil(videos.length / 3))} video ideas (one per distinct trend, angle, or sub-topic). Do NOT stop at 5. Scan every single video, group them by theme, and produce one original idea per group. More groups = more ideas.

## Data: Top ${videos.length} Outlier Videos (ranked by composite score)
${videoList}

## Pattern Analysis: Title Formats That Work
${patternList}

## Topic Clusters: Trending Subjects
${clusterList}

## For each idea, provide:
1. TITLE: Clear, specific, optimized for CTR, 40-70 characters. Use a proven pattern from the data. Do NOT copy existing titles — create something original that a viewer would click instantly.
2. HOOK: The first 30 seconds. Be specific — what does the creator say, show, or do? Write it as a mini-script with exact words.
3. OUTLINE: 5-8 detailed sections forming a narrative arc. Each section MUST include specific names, tools, examples, numbers, or techniques — NOT vague descriptions. For example, if the title says "10 AI Tools", list the actual tool names (e.g. "ChatGPT for scriptwriting, Midjourney for thumbnails, Opus Clip for repurposing"). The creator should be able to film directly from the outline without doing additional research.
4. THUMBNAIL_CONCEPT: Specific visual (colors, text overlay max 4 words, facial expression, objects, layout) that a designer could execute.
5. WHY_THIS_WILL_WORK: Reference specific videos from the data by number, their metrics, and why demand exists. Use actual numbers.
6. UNIQUE_ANGLE: What makes this different from the existing videos? The creator needs a clear reason to exist.
7. OPTIMAL_LENGTH: Recommended video duration based on what works in the data.
8. SUGGESTED_TAGS: 5-8 tags optimized for YouTube search.
9. BASED_ON_INDICES: Array of 0-indexed positions of videos from the data above that inspired this idea.

## Rules
- You MUST produce at least ${Math.max(10, Math.ceil(videos.length / 3))} ideas. Do NOT stop at 5.
- Group similar videos and create ONE strong idea per group
- Every video above should be covered by at least one idea
- Rank ideas by estimated potential (best first)
- Titles must be crystal clear — a viewer should know exactly what the video is about
- Outlines must name specific tools, products, techniques, or examples — NEVER write vague lines like "Showcase specific tools" or "Deep dive into each tool". Instead write "Showcase Cursor AI for coding, ElevenLabs for voiceovers, and Runway for video editing"
- Be specific and actionable, not generic
- Reference real data to justify each idea

Respond ONLY with valid JSON array (no markdown fences, no extra text):
[
  {
    "title": "...",
    "hook": "...",
    "outline": ["...", "...", "...", "...", "..."],
    "thumbnailConcept": "...",
    "whyThisWillWork": "...",
    "uniqueAngle": "...",
    "optimalLength": "...",
    "suggestedTags": ["...", "..."],
    "basedOnIndices": [0, 3]
  }
]`;
}

function parseJSON(text: string): unknown {
  // Strip markdown fences if present
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/\n?```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON array from text
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Failed to parse AI response as JSON");
  }
}

async function callClaude(
  apiKey: string,
  prompt: string
): Promise<unknown> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ||
        `Claude API error: ${res.status}`
    );
  }

  const data = await res.json();
  const text = (data as { content?: { text?: string }[] }).content?.[0]?.text || "[]";
  return parseJSON(text);
}

async function callOpenAI(
  apiKey: string,
  prompt: string
): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ||
        `OpenAI API error: ${res.status}`
    );
  }

  const data = await res.json();
  const text =
    (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]
      ?.message?.content || "[]";
  return parseJSON(text);
}

function postProcess(
  raw: unknown,
  topVideos: GenerateAIIdeasRequest["topVideos"]
): AIVideoIdea[] {
  if (!Array.isArray(raw)) {
    throw new Error("AI response was not an array");
  }

  return raw.map((item: Record<string, unknown>, idx: number) => {
    // Map basedOnIndices to actual video references
    const indices = Array.isArray(item.basedOnIndices)
      ? (item.basedOnIndices as number[]).filter(
          (i) => typeof i === "number" && i >= 0 && i < topVideos.length
        )
      : [];

    const basedOn = indices.map((i) => ({
      videoId: topVideos[i].videoId,
      title: topVideos[i].title,
      views: topVideos[i].views,
      grade: topVideos[i].grade,
    }));

    return {
      id: idx + 1,
      title: String(item.title || "Untitled"),
      hook: String(item.hook || ""),
      outline: Array.isArray(item.outline)
        ? (item.outline as string[]).map(String)
        : [],
      thumbnailConcept: String(item.thumbnailConcept || ""),
      whyThisWillWork: String(item.whyThisWillWork || ""),
      uniqueAngle: String(item.uniqueAngle || ""),
      basedOn,
      optimalLength: String(item.optimalLength || "varies"),
      suggestedTags: Array.isArray(item.suggestedTags)
        ? (item.suggestedTags as string[]).map(String)
        : [],
    };
  });
}

export async function generateAIIdeas(
  req: GenerateAIIdeasRequest
): Promise<AIVideoIdea[]> {
  const prompt = buildPrompt(req);

  const raw =
    req.aiProvider === "claude"
      ? await callClaude(req.aiApiKey, prompt)
      : await callOpenAI(req.aiApiKey, prompt);

  return postProcess(raw, req.topVideos);
}

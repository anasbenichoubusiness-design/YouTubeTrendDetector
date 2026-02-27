import type { AIProvider, GenerateTitlesRequest, GeneratedTitle } from "../types";

function buildPrompt(req: GenerateTitlesRequest): string {
  const topVideosList = req.topVideos
    .slice(0, 5)
    .map(
      (v, i) =>
        `${i + 1}. "${v.title}" (Grade: ${v.grade}, Score: ${v.score.toFixed(1)}, Views: ${v.views.toLocaleString()})`
    )
    .join("\n");

  return `You are a YouTube title optimization expert. Based on the analysis of trending videos in the "${req.niche}" niche, generate 8 click-worthy title suggestions.

## Context
The user is exploring the "${req.niche}" niche. Their content idea is:
- Type: ${req.idea.type}
- Concept: "${req.idea.suggestedTitle}"
- Reasoning: ${req.idea.reasoning}
- Optimal length: ${req.idea.optimalLength}

## Top Performing Videos in This Niche
${topVideosList}

## Instructions
Generate exactly 8 title variations. Each title should:
- Use proven YouTube patterns (curiosity gap, numbers, emotional hooks, power words)
- Be 40-70 characters for optimal CTR
- Feel natural, not clickbaity
- Be distinct from each other (different angles/hooks)

Respond ONLY with valid JSON, no markdown fences:
[{"title": "...", "reasoning": "..."}]

Each reasoning should be 1 short sentence explaining the hook used.`;
}

async function callClaude(
  apiKey: string,
  prompt: string
): Promise<GeneratedTitle[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `Claude API error: ${res.status}`
    );
  }

  const data = await res.json();
  const text =
    data.content?.[0]?.text || "[]";
  return JSON.parse(text);
}

async function callOpenAI(
  apiKey: string,
  prompt: string
): Promise<GeneratedTitle[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `OpenAI API error: ${res.status}`
    );
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "[]";
  // Strip markdown fences if present
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function generateTitles(
  req: GenerateTitlesRequest
): Promise<GeneratedTitle[]> {
  const prompt = buildPrompt(req);

  if (req.aiProvider === "claude") {
    return callClaude(req.aiApiKey, prompt);
  } else {
    return callOpenAI(req.aiApiKey, prompt);
  }
}

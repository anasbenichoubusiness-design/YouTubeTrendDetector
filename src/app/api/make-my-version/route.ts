import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

async function fetchTranscript(videoId: string): Promise<string> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    // Combine all text segments into readable transcript
    return segments.map((s: { text: string }) => s.text).join(" ");
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const aiApiKey = body.aiApiKey?.trim() || process.env.AI_API_KEY || "";
    const aiProvider = body.aiProvider || process.env.AI_PROVIDER || "claude";

    if (!aiApiKey) {
      return NextResponse.json(
        { error: "AI API key is required. Set it in Settings." },
        { status: 400 }
      );
    }
    if (!body.video) {
      return NextResponse.json(
        { error: "No video selected." },
        { status: 400 }
      );
    }

    const v = body.video;
    const videoId = body.videoId || "";
    const niche = body.niche || "";
    const today = new Date().toISOString().split("T")[0];

    // Fetch the actual video transcript
    let transcript = "";
    if (videoId) {
      transcript = await fetchTranscript(videoId);
    }

    // Trim transcript to ~4000 words to fit in context
    if (transcript) {
      const words = transcript.split(/\s+/);
      if (words.length > 4000) {
        transcript = words.slice(0, 4000).join(" ") + "... [transcript truncated]";
      }
    }

    const transcriptSection = transcript
      ? `## Full Video Transcript (what was actually said)
${transcript}

Use this transcript to understand EXACTLY what the video covers — the specific points, tools, examples, stories, and structure. Your version must cover the same core content but with a better angle, better structure, and your own unique additions.`
      : `## Note
No transcript available for this video. Generate the brief based on the title, tags, and niche context.`;

    const prompt = `You are an elite YouTube content strategist and scriptwriter. A creator has found a trending video and wants to make their OWN version — not a copy, but a better, unique take on the same topic.

## Important Context
Today's date is ${today}. Everything must be relevant to ${new Date().getFullYear()}.

## The Trending Video They Want to Remake
- Title: "${v.title}"
- Channel: ${v.channelTitle}
- Views: ${v.views?.toLocaleString() || "N/A"}
- Engagement: ${v.engagement ? (v.engagement * 100).toFixed(1) + "%" : "N/A"}
- Velocity: ${v.velocity ? v.velocity.toFixed(0) + " views/day" : "N/A"}
- Grade: ${v.grade}
- Tags: ${v.tags?.slice(0, 10).join(", ") || "none"}
- Niche: ${niche}

${transcriptSection}

## Generate a COMPLETE video brief with:

1. TITLE: A better, more clickable title than the original. 40-70 chars. Must be clearly different but target the same audience demand.

2. HOOK: Write the EXACT script for the first 60 seconds. Word for word what the creator should say on camera. Make it captivating — address the viewer directly, create curiosity, promise value.

3. OUTLINE: 8-12 detailed sections. Since you know exactly what the original video covers from the transcript, your outline must:
   - Cover the same core topics but reorganized in a better structure
   - Add specific points or examples the original missed
   - Name every tool, product, technique, person, or example explicitly
   - Each section should be 2-3 sentences minimum with specific talking points
   - The creator should be able to film directly from this outline

4. THUMBNAIL_CONCEPT: Specific visual description — colors, text overlay (max 4 words), facial expression, objects, layout.

5. UNIQUE_ANGLE: What makes THIS version different and better than the original? Reference specific weaknesses or gaps in the original content.

6. SCRIPT: Write a complete 2-minute opening script (after the hook). Word for word, conversational tone, as if talking to camera. Reference specific content from the transcript that you're improving upon.

7. OPTIMAL_LENGTH: Recommended duration.

8. SUGGESTED_TAGS: 8-12 tags optimized for YouTube search.

Respond ONLY with valid JSON (no markdown fences):
{
  "title": "...",
  "hook": "...",
  "outline": ["Section 1: detailed paragraph...", "Section 2: detailed paragraph..."],
  "thumbnailConcept": "...",
  "uniqueAngle": "...",
  "script": "...",
  "optimalLength": "...",
  "suggestedTags": ["...", "..."]
}`;

    let text: string;

    if (aiProvider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": aiApiKey,
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
      text =
        (data as { content?: { text?: string }[] }).content?.[0]?.text || "{}";
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiApiKey}`,
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
      text =
        (data as { choices?: { message?: { content?: string } }[] })
          .choices?.[0]?.message?.content || "{}";
    }

    // Parse JSON
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/\n?```/g, "")
      .trim();
    let brief;
    try {
      brief = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        brief = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    return NextResponse.json({ brief, hasTranscript: !!transcript });
  } catch (err) {
    let message = "Failed to generate video brief";
    if (err instanceof Error) {
      message = err.message;
      if ("cause" in err && err.cause instanceof Error) {
        message += `: ${err.cause.message}`;
      }
    }
    if (message === "fetch failed" || message.startsWith("fetch failed")) {
      message =
        "Could not reach AI provider. Check your API key and internet connection.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

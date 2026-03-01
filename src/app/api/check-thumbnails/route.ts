import { NextRequest, NextResponse } from "next/server";

const BATCH_SIZE = 10;

interface ThumbnailEntry {
  id: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoIds, aiProvider, aiApiKey } = body as {
      videoIds: string[];
      aiProvider: string;
      aiApiKey: string;
    };

    const effectiveKey = aiApiKey?.trim() || process.env.AI_API_KEY || "";
    const effectiveProvider = aiProvider || process.env.AI_PROVIDER || "claude";

    if (!videoIds?.length || !effectiveKey) {
      return NextResponse.json({ nonEnglishVideoIds: [] });
    }

    // Build thumbnail entries (medium quality — 320×180, enough for text detection)
    const thumbnails: ThumbnailEntry[] = videoIds.map((id) => ({
      id,
      url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    }));

    // Split into batches
    const batches: ThumbnailEntry[][] = [];
    for (let i = 0; i < thumbnails.length; i += BATCH_SIZE) {
      batches.push(thumbnails.slice(i, i + BATCH_SIZE));
    }

    // Process batches in parallel
    const results = await Promise.all(
      batches.map((batch) =>
        checkBatch(batch, effectiveProvider, effectiveKey)
      )
    );

    const nonEnglishVideoIds = results.flat();

    return NextResponse.json({ nonEnglishVideoIds });
  } catch (err) {
    console.error("Thumbnail check error:", err);
    // On error, return empty — don't block the user
    return NextResponse.json({ nonEnglishVideoIds: [] });
  }
}

async function checkBatch(
  thumbnails: ThumbnailEntry[],
  provider: string,
  apiKey: string
): Promise<string[]> {
  try {
    // Download thumbnails as base64 in parallel
    const imageData = await Promise.all(
      thumbnails.map(async (t) => {
        try {
          const res = await fetch(t.url);
          if (!res.ok) return null;
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return { id: t.id, base64 };
        } catch {
          return null;
        }
      })
    );

    const validImages = imageData.filter(
      (d): d is { id: string; base64: string } => d !== null
    );

    if (validImages.length === 0) return [];

    if (provider === "claude") {
      return checkWithClaude(validImages, apiKey);
    } else {
      return checkWithOpenAI(validImages, thumbnails, apiKey);
    }
  } catch {
    return [];
  }
}

async function checkWithClaude(
  images: { id: string; base64: string }[],
  apiKey: string
): Promise<string[]> {
  // Build content blocks: label + image pairs
  const content: Record<string, unknown>[] = [];

  for (let i = 0; i < images.length; i++) {
    content.push({
      type: "text",
      text: `Thumbnail ${i + 1} (ID: ${images[i].id}):`,
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: images[i].base64,
      },
    });
  }

  content.push({
    type: "text",
    text: `Check each YouTube thumbnail above for non-English text. Look for Hindi (Devanagari), Arabic, Chinese, Japanese, Korean, Thai, Bengali, Tamil, Telugu, Urdu, or any other non-Latin script ON the thumbnail image itself. Small watermarks or logos can be ignored — focus on prominent text overlays.

Respond ONLY with a JSON array of the IDs that have non-English text visible on the thumbnail. If none have non-English text, respond with [].
Example: ["dQw4w9WgXcQ", "abc123"]`,
  });

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
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    content?: { text?: string }[];
  };
  const text = data.content?.[0]?.text || "[]";

  return parseIdArray(text);
}

async function checkWithOpenAI(
  images: { id: string; base64: string }[],
  thumbnails: ThumbnailEntry[],
  apiKey: string
): Promise<string[]> {
  // OpenAI vision format
  const contentParts: Record<string, unknown>[] = [];

  for (let i = 0; i < images.length; i++) {
    contentParts.push({
      type: "text",
      text: `Thumbnail ${i + 1} (ID: ${images[i].id}):`,
    });
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${images[i].base64}`,
        detail: "low",
      },
    });
  }

  contentParts.push({
    type: "text",
    text: `Check each YouTube thumbnail above for non-English text. Look for Hindi (Devanagari), Arabic, Chinese, Japanese, Korean, Thai, Bengali, Tamil, Telugu, Urdu, or any other non-Latin script ON the thumbnail image itself. Small watermarks or logos can be ignored — focus on prominent text overlays.

Respond ONLY with a JSON array of the IDs that have non-English text visible on the thumbnail. If none have non-English text, respond with [].
Example: ["dQw4w9WgXcQ", "abc123"]`,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
    }),
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content || "[]";

  return parseIdArray(text);
}

function parseIdArray(text: string): string[] {
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/\n?```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string");
    }
  } catch {
    // Try to extract array from text
    const match = cleaned.match(/\[[\s\S]*?\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === "string");
        }
      } catch {
        // give up
      }
    }
  }

  return [];
}

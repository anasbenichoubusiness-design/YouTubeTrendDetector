import { NextRequest, NextResponse } from "next/server";
import { generateAIIdeas } from "@/lib/ai/generate-ideas";
import type { GenerateAIIdeasRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateAIIdeasRequest = await request.json();

    // Use server env vars as fallback
    if (!body.aiApiKey?.trim() && process.env.AI_API_KEY) {
      body.aiApiKey = process.env.AI_API_KEY;
    }
    if (process.env.AI_PROVIDER && !body.aiProvider) {
      body.aiProvider = process.env.AI_PROVIDER as "claude" | "openai";
    }

    if (!body.aiApiKey?.trim()) {
      return NextResponse.json(
        { error: "AI API key is required. Set it in Settings." },
        { status: 400 }
      );
    }
    if (!body.topVideos || body.topVideos.length === 0) {
      return NextResponse.json(
        { error: "Outlier video data is required. Run an analysis first." },
        { status: 400 }
      );
    }

    const ideas = await generateAIIdeas(body);

    return NextResponse.json({ ideas });
  } catch (err) {
    let message = "Failed to generate ideas";
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

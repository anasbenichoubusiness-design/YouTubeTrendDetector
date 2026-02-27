import { NextRequest, NextResponse } from "next/server";
import { generateTitles } from "@/lib/ai/generate-titles";
import type { GenerateTitlesRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateTitlesRequest = await request.json();

    if (!body.aiApiKey?.trim()) {
      return NextResponse.json(
        { error: "AI API key is required. Set it in Settings." },
        { status: 400 }
      );
    }
    if (!body.idea) {
      return NextResponse.json(
        { error: "Video idea data is required." },
        { status: 400 }
      );
    }

    const titles = await generateTitles(body);

    return NextResponse.json({ titles });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate titles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

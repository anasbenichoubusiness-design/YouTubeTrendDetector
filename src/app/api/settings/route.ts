import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DIR = join(process.cwd(), ".tmp");
const FILE = join(DIR, "settings.json");

interface Settings {
  ytApiKey?: string;
  aiApiKey?: string;
  aiProvider?: string;
}

// Environment variable keys (set these in Vercel / .env for production)
const ENV_YT_KEY = process.env.YT_API_KEY || "";
const ENV_AI_KEY = process.env.AI_API_KEY || "";
const ENV_AI_PROVIDER = process.env.AI_PROVIDER || "";

async function read(): Promise<Settings> {
  try {
    const data = await readFile(FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function save(settings: Settings) {
  await mkdir(DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(settings, null, 2));
}

export async function GET() {
  const settings = await read();

  // Env vars take priority — if set, the keys are "server-configured"
  const ytApiKey = ENV_YT_KEY || settings.ytApiKey || null;
  const aiApiKey = ENV_AI_KEY || settings.aiApiKey || null;
  const aiProvider = ENV_AI_PROVIDER || settings.aiProvider || "claude";

  return NextResponse.json({
    ytApiKey,
    aiApiKey,
    aiProvider,
    // Tell the frontend which keys are server-locked (can't be changed by user)
    serverConfigured: {
      yt: !!ENV_YT_KEY,
      ai: !!ENV_AI_KEY,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const current = await read();

  if (body.ytApiKey !== undefined) current.ytApiKey = body.ytApiKey;
  if (body.aiApiKey !== undefined) current.aiApiKey = body.aiApiKey;
  if (body.aiProvider !== undefined) current.aiProvider = body.aiProvider;

  await save(current);
  return NextResponse.json({ ok: true });
}

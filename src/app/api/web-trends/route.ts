import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const encoded = encodeURIComponent(query.trim());
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch web trends" },
        { status: 502 }
      );
    }

    const xml = await res.text();

    // Parse RSS items with regex (no dependencies needed)
    const items: { title: string; source: string; link: string; publishedAt: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
      const block = match[1];

      const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const rawTitle = titleMatch?.[1] ?? titleMatch?.[2] ?? "";

      const linkMatch = block.match(/<link>(.*?)<\/link>|<link\/>\s*(https?:\/\/[^\s<]+)/);
      const link = linkMatch?.[1] ?? linkMatch?.[2] ?? "";

      const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
      const publishedAt = pubDateMatch?.[1] ?? "";

      const sourceMatch = block.match(/<source[^>]*>(.*?)<\/source>/);
      const source = sourceMatch?.[1] ?? "";

      // Split "Article Title - Source Name" format
      let title = rawTitle;
      if (!source && rawTitle.includes(" - ")) {
        const lastDash = rawTitle.lastIndexOf(" - ");
        title = rawTitle.substring(0, lastDash);
      }

      if (title) {
        items.push({
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          source: source || (rawTitle.includes(" - ") ? rawTitle.substring(rawTitle.lastIndexOf(" - ") + 3) : ""),
          link,
          publishedAt,
        });
      }
    }

    return NextResponse.json({ trends: items, query: query.trim() });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch web trends" },
      { status: 500 }
    );
  }
}

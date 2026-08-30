import { NextResponse, type NextRequest } from "next/server";
import { INSTAGRAM_EMBED_USER_AGENT, isAllowedImageUrl } from "@/lib/instagram-embed";

// /api/og が返す画像URL(Instagram CDN)をブラウザから直接叩けない場合の中継プロキシ。
// 任意のURLを中継するとSSRFになるため、httpsかつInstagram/FacebookのCDNドメインのみ許可する。
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8000;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url || !isAllowedImageUrl(url)) {
    return NextResponse.json(
      { error: "invalid url" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": INSTAGRAM_EMBED_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok || !res.body) {
      return NextResponse.json(
        { error: "unavailable" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "unavailable" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
}

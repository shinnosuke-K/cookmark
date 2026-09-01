import { NextResponse, type NextRequest } from "next/server";
import { INSTAGRAM_EMBED_USER_AGENT, isAllowedImageUrl } from "@/lib/instagram-embed";
import { forbidden, isSameOriginRequest } from "../same-origin";

// /api/og が返す画像URL(Instagram CDN)をブラウザから直接叩けない場合の中継プロキシ。
// 任意のURLを中継するとSSRFになるため、httpsかつInstagram/FacebookのCDNドメインのみ許可する。
// リダイレクト(redirect: "manual")は追わない — 許可ドメインのURLが許可外ホストへ302する
// 抜け道を塞ぐため(hop 0のみのチェックでは不十分)。上流のContent-Typeも image/* 以外は
// 中継しない。
export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8000;

const COMMON_HEADERS = {
  "Cache-Control": "no-store",
  // 上流のContent-Typeをそのまま転送するため、ブラウザのMIMEスニッフィングで
  // 実行可能コンテンツとして解釈されないよう明示する。
  "X-Content-Type-Options": "nosniff",
} as const;

function badRequest() {
  return NextResponse.json({ error: "invalid url" }, { status: 400, headers: COMMON_HEADERS });
}

function unavailable() {
  return NextResponse.json({ error: "unavailable" }, { status: 404, headers: COMMON_HEADERS });
}

export async function GET(request: NextRequest) {
  if (!isSameOriginRequest(request)) return forbidden();

  const url = request.nextUrl.searchParams.get("url");
  if (!url || !isAllowedImageUrl(url)) {
    return badRequest();
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": INSTAGRAM_EMBED_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "manual",
    });
    // redirect: "manual" では3xxは opaqueredirect (ok: false) として返るため、
    // 許可ドメイン外へのリダイレクトも含めてここで弾かれる。
    if (!res.ok || !res.body) return unavailable();

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return unavailable();

    return new NextResponse(res.body, {
      status: 200,
      headers: {
        ...COMMON_HEADERS,
        "Content-Type": contentType,
      },
    });
  } catch {
    return unavailable();
  }
}

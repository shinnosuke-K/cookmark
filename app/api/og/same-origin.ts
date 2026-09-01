import { NextResponse, type NextRequest } from "next/server";

// /api/og系はSSRF対策済みのプロキシだが、ブラウザ外(bot・他サイトからの直叩き)から
// 任意に叩けると外部リクエストの踏み台に使われうるため、同一オリジン以外を拒否する。
// ヘッダー検査なので偽装可能であり、確実な認証ではなく「カジュアルな悪用・botの抑止」が目的。モダンブラウザは Sec-Fetch-Site を必ず送るため、まずそれを見る。
// (Sec-Fetch-Siteを送らない古いブラウザ向けの)フォールバックとして Origin / Referer の
// ホストがリクエスト自身のホストと一致するかを見る。どちらも無ければ拒否する。
function isSameOriginHost(request: NextRequest, headerValue: string | null): boolean {
  if (!headerValue) return false;
  try {
    const url = new URL(headerValue);
    return url.host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export function isSameOriginRequest(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite === "same-origin";

  const origin = request.headers.get("origin");
  if (origin) return isSameOriginHost(request, origin);

  const referer = request.headers.get("referer");
  if (referer) return isSameOriginHost(request, referer);

  return false;
}

export function forbidden() {
  return NextResponse.json(
    { error: "forbidden" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

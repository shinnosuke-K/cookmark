import { NextResponse, type NextRequest } from "next/server";
import { INSTAGRAM_EMBED_USER_AGENT, parseEmbedHtml } from "@/lib/instagram-embed";

// Instagram投稿のタイトル・キャプション・投稿者・画像URLをベストエフォートで取得する
// プロキシ。Meta公式oEmbed APIは使わない方針のため、ログイン不要で開ける
// embed(captioned)ページのHTMLを取得してパースする。失敗は常に404 JSONで返し、
// クライアント側は例外を投げずにnullへフォールバックする(手動入力は常に成立する)。
export const dynamic = "force-dynamic";

const SHORTCODE_PATTERN = /^[\w-]+$/;
const FETCH_TIMEOUT_MS = 5000;

function unavailable() {
  return NextResponse.json(
    { error: "unavailable" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const shortcode = request.nextUrl.searchParams.get("shortcode");
  if (!shortcode || !SHORTCODE_PATTERN.test(shortcode)) {
    return NextResponse.json(
      { error: "invalid shortcode" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let parsed: ReturnType<typeof parseEmbedHtml>;
  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
      headers: { "User-Agent": INSTAGRAM_EMBED_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return unavailable();
    const html = await res.text();
    // parseEmbedHtml自体は例外を投げない設計だが、想定外の入力(異常な数値実体参照等)に
    // 対しても確実に404へ倒すため、念のためtry内で呼ぶ。
    parsed = parseEmbedHtml(html);
  } catch {
    return unavailable();
  }

  if (!parsed) return unavailable();

  return NextResponse.json(parsed, { headers: { "Cache-Control": "no-store" } });
}

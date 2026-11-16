import { NextResponse, type NextRequest } from "next/server";
import {
  INSTAGRAM_EMBED_USER_AGENT,
  parseEmbedHtml,
  type ParsedEmbed,
} from "@/lib/instagram-embed";
import { structureRecipe } from "@/lib/recipe-structurer";
import { isBoardMember } from "./board-member";
import { forbidden, isSameOriginRequest } from "./same-origin";

// Instagram投稿のタイトル・キャプション・投稿者・画像URLをベストエフォートで取得する
// プロキシ。Meta公式oEmbed APIは使わない方針のため、ログイン不要で開ける
// embed(captioned)ページのHTMLを取得してパースし、キャプションをClaudeに渡して
// 料理名・カテゴリ・食材を構造化する。HTMLの取得・パースの失敗は常に404 JSONで返し、
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
  if (!isSameOriginRequest(request)) return forbidden();

  const shortcode = request.nextUrl.searchParams.get("shortcode");
  if (!shortcode || !SHORTCODE_PATTERN.test(shortcode)) {
    return NextResponse.json(
      { error: "invalid shortcode" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [parsed, member] = await Promise.all([fetchEmbed(shortcode), isBoardMember(request)]);
  if (!parsed) return unavailable();

  // Claudeでの構造化(料理名・カテゴリ・食材)はボードのメンバーにだけ行う。メンバーで
  // ない場合や構造化に失敗した場合は、正規表現で得た結果だけを返す。
  const structured = member ? await structureRecipe(parsed.caption) : null;

  return NextResponse.json(
    {
      ...parsed,
      title: structured?.title || parsed.title,
      category: structured?.category ?? null,
      ingredients: structured?.ingredients ?? [],
      ingredientAmounts: structured?.ingredientAmounts ?? {},
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function fetchEmbed(shortcode: string): Promise<ParsedEmbed | null> {
  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/embed/captioned/`, {
      headers: { "User-Agent": INSTAGRAM_EMBED_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // parseEmbedHtml自体は例外を投げない設計だが、想定外の入力(異常な数値実体参照等)に
    // 対しても確実に404へ倒すため、念のためtry内で呼ぶ。
    return parseEmbedHtml(html);
  } catch {
    return null;
  }
}

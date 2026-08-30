// Instagram embed(captioned)ページのHTMLから画像URL・キャプション・投稿者ハンドルを
// ベストエフォートで抽出するサーバー専用ユーティリティ。Meta公式oEmbed APIは使わない
// 方針のため、埋め込みページのHTML構造に依存する軽量パーサー(正規表現ベース)とする。
// 構造が変われば抽出に失敗しうるが、呼び出し側(app/api/og/route.ts)はその場合404を
// 返すだけで、クライアントは常に手動入力へフォールバックできる(この関数自体は例外を
// 投げない)。

export const INSTAGRAM_EMBED_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const MAX_TITLE_LENGTH = 80;

export interface ParsedEmbed {
  title: string;
  caption: string;
  authorHandle: string | null;
  imageUrl: string;
}

/** HTML実体参照(名前参照・数値参照)をデコードする。 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** `<img class="…EmbeddedMediaImage…" … src="…">` からsrcを取り出す(属性の順序は問わない)。 */
function findImageUrl(html: string): string | null {
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imgTags) {
    if (!/class="[^"]*\bEmbeddedMediaImage\b[^"]*"/.test(tag)) continue;
    const srcMatch = tag.match(/\bsrc="([^"]*)"/);
    if (srcMatch) return decodeHtmlEntities(srcMatch[1]);
  }
  return null;
}

/** `class="Caption"` のdivの中身(投稿者ハンドル行込み)をプレーンテキストの行配列にする。 */
function extractCaptionLines(html: string): string[] {
  const match = html.match(
    /<div class="Caption">([\s\S]*?)(?:<div class="CaptionComments">|<\/div><div class="Footer">)/,
  );
  if (!match) return [];

  const plain = match[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
  return decodeHtmlEntities(plain)
    .split("\n")
    .map((line) => line.trim());
}

/** 「View all N comments」等の残骸が末尾に残っていれば取り除く(構造の揺れに対する保険)。 */
function stripTrailingCommentsArtifact(lines: string[]): string[] {
  const result = [...lines];
  while (
    result.length > 0 &&
    /^(view (all )?[\d,]+ comments?|log in to .*)$/i.test(result[result.length - 1])
  ) {
    result.pop();
  }
  return result;
}

function trimEmptyEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === "") start++;
  while (end > start && lines[end - 1] === "") end--;
  return lines.slice(start, end);
}

function buildTitle(caption: string): string {
  const firstLine = caption.split("\n").find((line) => line.trim() !== "") ?? "";
  let title = firstLine.trim();
  if (title.length >= 2 && title.startsWith("【") && title.endsWith("】")) {
    title = title.slice(1, -1).trim();
  }
  const chars = Array.from(title);
  return chars.length > MAX_TITLE_LENGTH ? chars.slice(0, MAX_TITLE_LENGTH).join("") : title;
}

/**
 * embed(captioned)ページのHTMLをパースする。ログイン壁のシェルページ等で画像が
 * 見つからない場合はnullを返す(呼び出し側で404「unavailable」として扱う)。
 */
export function parseEmbedHtml(html: string): ParsedEmbed | null {
  const imageUrl = findImageUrl(html);
  if (!imageUrl) return null;

  let lines = trimEmptyEdges(extractCaptionLines(html));

  // 先頭行が投稿者ハンドルのみの行であれば、それを投稿者として取り出しキャプションからは除く。
  let authorHandle: string | null = null;
  if (lines.length > 0 && /^[\w.]+$/.test(lines[0])) {
    authorHandle = lines[0];
    lines = trimEmptyEdges(lines.slice(1));
  }

  lines = trimEmptyEdges(stripTrailingCommentsArtifact(lines));

  const caption = lines.join("\n").trim();
  const title = buildTitle(caption);

  return { title, caption, authorHandle, imageUrl };
}

const ALLOWED_IMAGE_HOST_SUFFIXES = [".cdninstagram.com", ".fbcdn.net"];

/**
 * 画像プロキシのSSRF対策。httpsかつInstagram/Facebookの配信ドメイン(の正しいサフィックス)
 * のみを許可する(部分一致ではなくホスト名末尾の厳密一致)。
 */
export function isAllowedImageUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
}

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

function isValidCodePoint(codePoint: number): boolean {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * HTML実体参照(名前参照・数値参照)を一度のパスでデコードする。範囲外の数値参照
 * (例: `&#x110000;`)は `String.fromCodePoint` が例外を投げるため、その場合は元の
 * テキストのまま残す(呼び出し側を落とさない)。一度のパスで処理することで
 * `&#38;lt;` のような二重エンコードを誤って `<` へ展開してしまう(二重デコード)事故も防ぐ。
 */
function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&#x([0-9a-fA-F]+);|&#(\d+);|&(amp|lt|gt|quot|apos|nbsp);/g,
    (match: string, hex?: string, dec?: string, named?: string) => {
      if (hex !== undefined) {
        const codePoint = parseInt(hex, 16);
        return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      if (dec !== undefined) {
        const codePoint = parseInt(dec, 10);
        return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      return named !== undefined ? NAMED_ENTITIES[named] : match;
    },
  );
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

/**
 * Unicodeのコードポイント単位で文字列を切り詰める。`string.slice()` はUTF-16
 * コード単位で切るためサロゲートペア(絵文字等)の境界で分断してしまうことがあり、
 * その半端な文字列はPostgRESTにJSONとして拒否される。呼び出し側(キャプションの
 * memo保存等)はこちらを使うこと。
 */
export function truncateToCodePoints(text: string, maxLength: number): string {
  const chars = Array.from(text);
  return chars.length > maxLength ? chars.slice(0, maxLength).join("") : text;
}

function buildTitle(caption: string): string {
  const firstLine = caption.split("\n").find((line) => line.trim() !== "") ?? "";
  let title = firstLine.trim();
  if (title.length >= 2 && title.startsWith("【") && title.endsWith("】")) {
    title = title.slice(1, -1).trim();
  }
  return truncateToCodePoints(title, MAX_TITLE_LENGTH);
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

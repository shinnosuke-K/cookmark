// 貼り付けられたテキストからInstagramの投稿/リールURLとハンドルを検出するユーティリティ。
// Meta公式APIは使わない方針のため、正規表現でベストエフォート抽出する(失敗しても
// 呼び出し側は常に手動入力にフォールバックできる)。

import type { RecipeCategory, Seasoning } from "./database.types";
import { supabase } from "./supabase";

const INSTAGRAM_URL_PATTERN = /instagram\.com\/(p|reel|reels)\/([\w-]+)/i;
const HANDLE_PATTERN = /@([a-zA-Z0-9_.]+)/;

export interface ParsedInstagramUrl {
  shortcode: string;
  cleanUrl: string;
}

/**
 * 貼り付けテキストからInstagramの投稿/リールURLを検出する。
 * クエリパラメータや共有用の余分な文字列は除去し、shortcodeから
 * クリーンなURLを組み立てて返す。マッチしなければnull。
 */
export function parseInstagramUrl(text: string): ParsedInstagramUrl | null {
  const match = text.match(INSTAGRAM_URL_PATTERN);
  if (!match) return null;

  const [, kind, shortcode] = match;
  return {
    shortcode,
    cleanUrl: `https://www.instagram.com/${kind}/${shortcode}/`,
  };
}

/**
 * 貼り付けテキストに含まれる「@ハンドル」を抽出する(共有シートの
 * テキストに投稿者が含まれている場合の自動入力用)。無ければnull。
 */
export function extractAuthorHandle(text: string): string | null {
  const match = text.match(HANDLE_PATTERN);
  return match ? match[1] : null;
}

export interface OgData {
  title: string;
  caption: string;
  authorHandle: string | null;
  imageUrl: string;
  /** Claudeが推定したカテゴリ。構造化できなかった場合はnull。 */
  category: RecipeCategory | null;
  /** Claudeが抜き出した主な食材。構造化できなかった場合は空配列。 */
  ingredients: string[];
  /** 食材ごとの分量(食材名 → 分量)。キャプションに分量の記載があった食材のみ。 */
  ingredientAmounts: Record<string, string>;
  /** 調味料と分量(記載順)。構造化できなかった場合は空配列。 */
  seasonings: Seasoning[];
}

// サーバー側はInstagramの取得(最大5秒)のあとにClaudeでの構造化(最大8秒)を行う。
const OG_FETCH_TIMEOUT_MS = 15000;

/**
 * `/api/og` 系はボードのメンバーしか呼べないため、サーバーがメンバーかどうかを
 * 確かめられるよう、現在のセッションのアクセストークンを添える。
 */
export async function ogAuthHeaders(): Promise<HeadersInit | undefined> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/**
 * サーバー側プロキシ `/api/og` 経由で、Instagram投稿のタイトル・キャプション・
 * 投稿者・画像URL・カテゴリ・食材(と分量)をベストエフォートで取得する。あくまで自動取得は
 * 補助的な機能なので、失敗しても例外は投げずnullを返す(呼び出し側は常に手動入力に
 * フォールバックできる)。
 */
export async function fetchOgData(shortcode: string): Promise<OgData | null> {
  try {
    const res = await fetch(`/api/og?shortcode=${encodeURIComponent(shortcode)}`, {
      headers: await ogAuthHeaders(),
      signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as OgData;
  } catch {
    return null;
  }
}

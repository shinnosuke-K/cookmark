"use client";

import { Button } from "@astryxdesign/core/Button";
import { extractAuthorHandle, parseInstagramUrl } from "@/lib/instagram";
import type { AddRecipeFormInitial } from "./AddRecipeForm";

interface PasteBannerProps {
  onOpen: (initial: AddRecipeFormInitial) => void;
}

/**
 * ホーム最上部の「+ 貼り付けて追加」ボタン。
 * navigator.clipboard.readText() はユーザー操作起点でしか呼べない(iOSは毎回
 * ネイティブの許可UIが出る)ため、このタップハンドラの中でのみ呼び出す。
 * 拒否・失敗時もエラーにはせず、URL欄が空の追加フォームを開いて手動入力に
 * フォールバックする。
 */
export function PasteBanner({ onOpen }: PasteBannerProps) {
  async function handleTap() {
    let url = "";
    let authorHandle = "";
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseInstagramUrl(text);
      url = parsed?.cleanUrl ?? "";
      authorHandle = extractAuthorHandle(text) ?? "";
    } catch {
      // 読み取り拒否・未対応ブラウザ → フォームのURL欄で手動入力してもらう
    }
    onOpen({ url, title: "", authorHandle, category: null });
  }

  return (
    <Button
      label="+ 貼り付けて追加"
      variant="primary"
      size="lg"
      width="100%"
      className="min-h-14"
      onClick={handleTap}
    />
  );
}

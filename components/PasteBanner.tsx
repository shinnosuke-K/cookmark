"use client";

import { ClipboardText } from "@phosphor-icons/react/dist/csr/ClipboardText";
import { extractAuthorHandle, parseInstagramUrl } from "@/lib/instagram";
import type { AddRecipeFormInitial } from "./AddRecipeForm";

interface PasteBannerProps {
  onOpen: (initial: AddRecipeFormInitial) => void;
}

/**
 * ホーム下部(タブバー直上)に浮かぶ「貼り付けて追加」ピル。
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
    <button
      type="button"
      onClick={handleTap}
      className="ck-btn ck-btn-primary ck-pill fixed left-1/2 z-20 min-h-14 -translate-x-1/2 px-7 text-[17px] whitespace-nowrap shadow-pill"
      style={{ bottom: "calc(var(--tabbar-h) + 24px)" }}
    >
      <ClipboardText size={22} weight="duotone" />
      貼り付けて追加
    </button>
  );
}

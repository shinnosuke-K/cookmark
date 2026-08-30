"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  /** スクリーンリーダー向けの見出し名 */
  label: string;
  /** 背景タップ・Escape・スワイプ相当の「閉じる」操作 */
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * 下から出るボトムシート。
 * Astryxの`BottomSheet`はDOM構造と配色がBroadsheetのモック(ハンドル・角丸14px・
 * 背景 rgba(45,43,43,.45)・.25sのスライドイン)に合わないため、必要な機構だけを
 * 持つ最小実装に置き換えている。
 */
export function Sheet({ label, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // 開いている間は背面のスクロールを止め、Escapeで閉じられるようにする
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  // シートは常にユーザー操作で開かれるため、プリレンダー時にここへは来ない
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="ck-anim-fade fixed inset-0 z-40"
        style={{ background: "color-mix(in srgb, #2d2b2b 45%, transparent)" }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="ck-anim-sheet fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto bg-bg px-[22px] pt-[14px] shadow-lg"
        style={{
          borderRadius: "14px 14px 0 0",
          paddingBottom: "calc(44px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="ck-pill mx-auto mb-[18px] block h-1 w-10 bg-neutral-400"
        />
        {children}
      </div>
    </>,
    document.body,
  );
}

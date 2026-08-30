"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 削除など取り消せない操作の確認ダイアログ。`window.confirm`はネイティブUIのため
 * Broadsheetの体裁にできず、モック(4b)の見た目に合わせた自前実装に置き換えている。
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = "キャンセル",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  // 確認ダイアログは常にユーザー操作で開かれるため、プリレンダー時にここへは来ない
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ck-anim-dialog fixed inset-0 z-60 flex items-center justify-center p-6"
      style={{ background: "color-mix(in srgb, #2d2b2b 45%, transparent)" }}
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-[min(320px,90%)] rounded-lg bg-bg p-5 shadow-md"
      >
        <p className="text-[18px] font-semibold">{title}</p>
        {body && <p className="ck-meta mt-1.5">{body}</p>}
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            className="ck-btn ck-btn-secondary min-h-11 text-[14px]"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="ck-btn ck-btn-danger min-h-11 text-[14px]"
            disabled={isPending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

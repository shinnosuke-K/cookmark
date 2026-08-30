"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOAST_DURATION_MS = 2200;

const ToastContext = createContext<((message: string) => void) | null>(null);

/**
 * 画面上部中央に出るダーク地のピル。保存・コピー・削除・追加・バリデーションまで、
 * すべての操作フィードバックをこれ1種類で表す(成功/失敗で見た目を変えない)。
 * 約2.2秒で自動的に消える。
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  // 連続表示でもアニメーションが再生されるよう、表示ごとにkeyを更新する
  const [seq, setSeq] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const toast = useCallback((next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(next);
    setSeq((n) => n + 1);
    timerRef.current = setTimeout(() => setMessage(null), TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext value={toast}>
      {children}
      {/* messageは初期値nullなので、プリレンダー中にportalへ入ることはない */}
      {message &&
        typeof document !== "undefined" &&
        createPortal(
          // 中央寄せは外側のflexで行う。translateユーティリティを重ねると
          // キーフレームのtransformと合成されて二重にずれるため。
          <div
            key={seq}
            className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 22px)" }}
          >
            <div
              role="status"
              aria-live="polite"
              // モックのトーストは1行だが、長いエラー文が省略されないよう折り返しは許す
              className="ck-anim-toast ck-pill max-w-full bg-neutral-900 px-[18px] py-[10px] text-center text-[14px] text-bg shadow-md"
            >
              {message}
            </div>
          </div>,
          document.body,
        )}
    </ToastContext>
  );
}

export function useToast() {
  const toast = use(ToastContext);
  if (!toast) throw new Error("useToast must be used within ToastProvider");
  return toast;
}

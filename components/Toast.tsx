"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOAST_DURATION_MS = 2200;
// 「元に戻す」などの操作ボタン付きは、読んで押す時間を確保するため長めに出す
const TOAST_WITH_ACTION_DURATION_MS = 5000;

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export type ToastFn = (message: string, action?: ToastAction) => void;

const ToastContext = createContext<ToastFn | null>(null);

interface ToastState {
  message: string;
  action: ToastAction | null;
}

/**
 * 画面上部中央に出るダーク地のピル。保存・コピー・削除・追加・バリデーションまで、
 * すべての操作フィードバックをこれ1種類で表す(成功/失敗で見た目を変えない)。
 * 約2.2秒で自動的に消える。
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState | null>(null);
  // 連続表示でもアニメーションが再生されるよう、表示ごとにkeyを更新する
  const [seq, setSeq] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const toast = useCallback<ToastFn>((next, action) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ message: next, action: action ?? null });
    setSeq((n) => n + 1);
    timerRef.current = setTimeout(
      () => setState(null),
      action ? TOAST_WITH_ACTION_DURATION_MS : TOAST_DURATION_MS,
    );
  }, []);

  function handleAction() {
    if (!state?.action) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(null);
    state.action.onAction();
  }

  return (
    <ToastContext value={toast}>
      {children}
      {/* messageは初期値nullなので、プリレンダー中にportalへ入ることはない */}
      {state &&
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
              className="ck-anim-toast ck-pill flex max-w-full items-center gap-3 bg-neutral-900 px-[18px] py-[10px] text-center text-[14px] text-bg shadow-md"
            >
              {state.message}
              {state.action && (
                // 操作ボタンだけはタップを受ける(外側はpointer-events-noneのまま)
                <button
                  type="button"
                  onClick={handleAction}
                  className="pointer-events-auto -my-2 min-h-11 shrink-0 px-1 font-semibold text-accent-100 underline underline-offset-2"
                >
                  {state.action.label}
                </button>
              )}
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

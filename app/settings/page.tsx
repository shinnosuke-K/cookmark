"use client";

import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Link as LinkIcon } from "@phosphor-icons/react/dist/csr/Link";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { useBoard, useMyMember, useRotateInviteToken } from "@/lib/board";

const COPIED_RESET_MS = 2400;

export default function SettingsPage() {
  const toast = useToast();
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: board, isLoading: boardLoading } = useBoard(member?.board_id);
  const rotateInviteToken = useRotateInviteToken(board?.id);
  const [copied, setCopied] = useState(false);
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  const inviteUrl = useMemo(() => {
    if (!board || typeof window === "undefined") return null;
    return `${window.location.origin}/join/${board.invite_token}`;
  }, [board]);

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast("招待URLをコピーしました");
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      toast("コピーに失敗しました。長押しで手動コピーしてください");
    }
  }

  function handleRotate() {
    if (!board) return;
    rotateInviteToken.mutate(undefined, {
      onSuccess: () => {
        setRotateConfirmOpen(false);
        toast("招待URLを再発行しました");
      },
      onError: () => {
        setRotateConfirmOpen(false);
        toast("再発行に失敗しました。もう一度お試しください");
      },
    });
  }

  if (memberLoading || boardLoading) {
    return (
      <div className="ck-screen ck-meta items-center justify-center">
        読み込み中...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="ck-screen ck-meta items-center justify-center text-center">
        まだボードに参加していません
      </div>
    );
  }

  return (
    <div className="ck-screen">
      <h1 className="ck-title mb-[26px]">設定</h1>

      <div className="mb-[30px]">
        <p className="mb-1 text-[14px] text-[color-mix(in_srgb,var(--color-text)_70%,transparent)]">
          表示名
        </p>
        <p className="text-[20px] font-semibold">{member.display_name}</p>
      </div>

      {/*
        招待URLはiOSでサイトデータが消えて匿名セッションを失ったときの
        唯一の復帰導線なので、設定画面に常時出しておく。
      */}
      <div>
        <h2 className="mb-2 flex items-center gap-1.5 text-[18px] font-semibold">
          <LinkIcon size={18} weight="duotone" color="var(--color-accent)" />
          招待URL
        </h2>
        <p className="mb-3.5 text-[14px] leading-[1.6] text-[rgba(32,30,29,.65)]">
          このURLをパートナーに送るとボードに参加できます。iOSでアプリのデータが消えてログインできなくなった場合も、このURLからもう一度参加できます。
        </p>
        <div className="flex items-stretch gap-2.5">
          <input
            className="ck-input min-h-12 truncate font-mono text-[14px] text-[rgba(32,30,29,.7)]"
            value={inviteUrl ?? ""}
            readOnly
            aria-label="招待URL"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={handleCopy}
            className="ck-btn ck-btn-primary ck-pill min-h-12 flex-none px-5 text-[15px]"
          >
            {copied ? (
              <Check size={18} weight="duotone" />
            ) : (
              <Copy size={18} weight="duotone" />
            )}
            {copied ? "コピー済み" : "コピー"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setRotateConfirmOpen(true)}
          disabled={rotateInviteToken.isPending}
          className="ck-btn ck-btn-ghost mt-2.5 min-h-11 text-[14px]"
          style={{ color: "var(--color-accent-2-700)" }}
        >
          <ArrowsClockwise size={16} weight="duotone" />
          招待URLを再発行
        </button>
      </div>

      {rotateConfirmOpen && (
        <ConfirmDialog
          title="招待URLを再発行しますか?"
          body="今の招待URLは使えなくなります。再発行しますか?"
          confirmLabel="再発行する"
          isPending={rotateInviteToken.isPending}
          onConfirm={handleRotate}
          onCancel={() => setRotateConfirmOpen(false)}
        />
      )}
    </div>
  );
}

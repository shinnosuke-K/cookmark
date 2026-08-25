"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useBoard, useMyMember } from "@/lib/board";

export default function SettingsPage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: board, isLoading: boardLoading } = useBoard(member?.board_id);
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(() => {
    if (!board || typeof window === "undefined") return null;
    return `${window.location.origin}/join/${board.invite_token}`;
  }, [board]);

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("招待URLをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました。長押しで手動コピーしてください");
    }
  }

  if (memberLoading || boardLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        読み込み中...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-zinc-500">
        <p>まだボードに参加していません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <h1 className="text-xl font-semibold">設定</h1>

      <section className="space-y-1">
        <h2 className="text-sm font-medium text-zinc-500">表示名</h2>
        <p className="text-base">{member.display_name}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-zinc-500">招待URL</h2>
        <p className="text-sm text-zinc-400">
          このURLをパートナーに送るとボードに参加できます。iOSでアプリのデータが消えてログインできなくなった場合も、このURLからもう一度参加できます。
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={inviteUrl ?? ""}
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 truncate rounded-lg border border-zinc-300 px-3 py-3 text-sm"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] shrink-0 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white"
          >
            {copied ? "コピー済み" : "コピー"}
          </button>
        </div>
      </section>
    </div>
  );
}

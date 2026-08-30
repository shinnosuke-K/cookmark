"use client";

import { EnvelopeOpen } from "@phosphor-icons/react/dist/csr/EnvelopeOpen";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";
import { useJoinBoard } from "@/lib/board";

interface JoinScreenProps {
  /** 招待URLのトークン(ルートの動的セグメント) */
  inviteToken: string;
}

/**
 * 招待URLからボードに参加する単独画面(タブバーなし)。モック4e。
 * iOSでサイトデータが消えて匿名セッションを失った場合も、同じURLから
 * 同じボードへ入り直せる(join_board RPCは既存メンバーなら表示名を更新する)。
 */
export function JoinScreen({ inviteToken }: JoinScreenProps) {
  const toast = useToast();
  const router = useRouter();
  const joinBoard = useJoinBoard();
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast("名前を入力してください");
      return;
    }

    joinBoard.mutate(
      { token: inviteToken, name: trimmed },
      {
        onSuccess: () => {
          toast("ボードに参加しました!");
          router.push("/");
        },
        onError: () =>
          toast("参加に失敗しました。招待URLをもう一度確認してください"),
      },
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-[34px] text-center">
      <EnvelopeOpen size={44} weight="duotone" color="var(--color-accent)" />

      <h1 className="mt-[18px] mb-2 text-[24px] leading-[1.25] font-semibold tracking-[-0.015em]">
        招待されたボードに
        <br />
        参加します
      </h1>
      <p className="mb-8 text-[15px] text-[rgba(32,30,29,.6)]">
        夫婦でInstagramのレシピを共有・管理するアプリです
      </p>

      <form onSubmit={handleSubmit} className="w-full text-left">
        <label className="ck-label" htmlFor="join-name">
          あなたの名前
        </label>
        <input
          id="join-name"
          className="ck-input min-h-12 text-[16px]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 夫、妻"
          autoFocus
        />
        <button
          type="submit"
          disabled={joinBoard.isPending}
          className="ck-btn ck-btn-primary mt-[18px] min-h-14 w-full text-[17px]"
        >
          {joinBoard.isPending ? "参加中..." : "参加する"}
        </button>
      </form>
    </div>
  );
}

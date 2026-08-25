"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useJoinBoard } from "@/lib/board";

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const joinBoard = useJoinBoard();
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("名前を入力してください");
      return;
    }

    joinBoard.mutate(
      { token: params.token, name: trimmed },
      {
        onSuccess: () => {
          toast.success("参加しました!");
          router.replace("/");
        },
        onError: () => {
          toast.error(
            "参加に失敗しました。招待URLを確認してもう一度お試しください",
          );
        },
      },
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Cookmarkに参加</h1>
        <p className="mt-2 text-sm text-zinc-500">
          招待されたボードに参加します
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs space-y-4 text-left"
      >
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-700"
          >
            あなたの名前
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 夫、妻"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base"
          />
        </div>
        <button
          type="submit"
          disabled={joinBoard.isPending}
          className="min-h-[44px] w-full rounded-lg bg-orange-500 py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {joinBoard.isPending ? "参加中..." : "参加する"}
        </button>
      </form>
    </div>
  );
}

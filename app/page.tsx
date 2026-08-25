"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreateBoard, useMyMember } from "@/lib/board";

export default function Home() {
  const { data: member, isLoading } = useMyMember();
  const createBoard = useCreateBoard();
  const [name, setName] = useState("");

  function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("名前を入力してください");
      return;
    }
    createBoard.mutate(trimmed, {
      onSuccess: () => {
        toast.success("ボードを作成しました!");
      },
      onError: () => {
        toast.error("ボードの作成に失敗しました。もう一度お試しください");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        読み込み中...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Cookmarkへようこそ</h1>
          <p className="mt-2 text-sm text-zinc-500">
            夫婦でInstagramのレシピを共有・管理するアプリです
          </p>
        </div>

        <form
          onSubmit={handleCreateBoard}
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
            disabled={createBoard.isPending}
            className="min-h-[44px] w-full rounded-lg bg-orange-500 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            {createBoard.isPending ? "作成中..." : "新しくボードを作る"}
          </button>
        </form>

        <p className="max-w-xs text-xs text-zinc-400">
          パートナーがすでにボードを作っている場合は、届いた招待URLを開いて参加してください
        </p>
      </div>
    );
  }

  // 参加済み: レシピ一覧は Task 3 で実装。ここはその置き換え起点。
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-sm text-zinc-500">レシピはまだありません</p>
    </div>
  );
}

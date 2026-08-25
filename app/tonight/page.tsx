"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RecipeThumbnail } from "@/components/RecipeThumbnail";
import { useMyMember } from "@/lib/board";
import { useArchiveRecipes, useTodoRecipes, type Recipe } from "@/lib/recipes";

type Source = "todo" | "repeat";

/** listからランダムに1件選ぶ。excludeIdがあれば(listが2件以上の場合)それを避ける。 */
function pickRandom(list: Recipe[], excludeId?: string): Recipe | null {
  if (list.length === 0) return null;
  if (list.length === 1 || !excludeId) {
    return list[Math.floor(Math.random() * list.length)];
  }
  const pool = list.filter((r) => r.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function TonightPage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: todoRecipes, isLoading: todoLoading } = useTodoRecipes(
    member?.board_id,
  );
  const { data: archiveRecipes, isLoading: archiveLoading } = useArchiveRecipes(
    member?.board_id,
  );

  const [source, setSource] = useState<Source>("todo");
  const [pick, setPick] = useState<Recipe | null>(null);

  const repeatRecipes = useMemo(
    () => (archiveRecipes ?? []).filter((r) => r.verdict === "repeat"),
    [archiveRecipes],
  );

  const pool = source === "todo" ? (todoRecipes ?? []) : repeatRecipes;
  const poolLoading = source === "todo" ? todoLoading : archiveLoading;

  // 表示元(source)の切り替えやデータ読み込み完了でpoolの中身が変わったら選び直す。
  // useEffectではなく、レンダー中にpoolの内容を前回と比較して直接setStateする
  // (CookedSheetのprevOpenと同じ「propの変化に応じてstateを調整する」パターン)。
  const poolKey = pool.map((r) => r.id).join(",");
  const [prevPoolKey, setPrevPoolKey] = useState(poolKey);
  if (poolKey !== prevPoolKey) {
    setPrevPoolKey(poolKey);
    setPick(pickRandom(pool));
  }

  function handleReroll() {
    setPick((current) => pickRandom(pool, current?.id));
  }

  if (memberLoading) {
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
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">今夜どうする</h1>

      <button
        type="button"
        onClick={() => setSource((s) => (s === "todo" ? "repeat" : "todo"))}
        className={`min-h-[48px] w-full rounded-xl text-base font-semibold ${
          source === "repeat"
            ? "bg-orange-500 text-white"
            : "border border-zinc-300 text-zinc-600"
        }`}
      >
        {source === "repeat"
          ? "✓ リピート確定から引いています"
          : "リピート確定から引く"}
      </button>

      {poolLoading ? (
        <p className="p-8 text-center text-sm text-zinc-500">読み込み中...</p>
      ) : pick ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6">
          <RecipeThumbnail photoPath={pick.photo_path} />
          <div className="text-center">
            <p className="text-lg font-semibold">{pick.title}</p>
            {pick.author_handle && (
              <p className="mt-1 text-sm text-zinc-500">@{pick.author_handle}</p>
            )}
            {pick.category && (
              <span className="mt-2 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-sm text-orange-600">
                {pick.category}
              </span>
            )}
          </div>

          <div className="flex w-full gap-3">
            <Link
              href={`/recipe/${pick.id}`}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-zinc-300 text-base font-semibold text-zinc-600"
            >
              詳しく見る
            </Link>
            <button
              type="button"
              onClick={handleReroll}
              disabled={pool.length <= 1}
              className="min-h-[44px] flex-1 rounded-lg bg-orange-500 text-base font-semibold text-white disabled:opacity-50"
            >
              別のにする
            </button>
          </div>
        </div>
      ) : (
        <p className="p-8 text-center text-sm text-zinc-500">
          {source === "todo"
            ? "未挑戦のレシピがありません"
            : "リピート確定のレシピがまだありません"}
        </p>
      )}
    </div>
  );
}

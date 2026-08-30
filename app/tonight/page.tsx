"use client";

import { Shuffle } from "@phosphor-icons/react/dist/csr/Shuffle";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryTag } from "@/components/CategoryChips";
import { RecipeThumbnail } from "@/components/RecipeThumbnail";
import { useToast } from "@/components/Toast";
import { useMyMember } from "@/lib/board";
import {
  useArchiveRecipes,
  useBoardMembers,
  useTodoRecipes,
  type Recipe,
} from "@/lib/recipes";

type Source = "todo" | "repeat";

const SOURCE_LABEL: Record<Source, string> = {
  todo: "未挑戦から",
  repeat: "リピート確定から",
};

function pickRandom(list: Recipe[]): Recipe | null {
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export default function TonightPage() {
  const toast = useToast();
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: todoRecipes, isLoading: todoLoading } = useTodoRecipes(
    member?.board_id,
  );
  const { data: archiveRecipes, isLoading: archiveLoading } = useArchiveRecipes(
    member?.board_id,
  );
  const { data: members } = useBoardMembers(member?.board_id);

  const [source, setSource] = useState<Source>("todo");
  const [pick, setPick] = useState<Recipe | null>(null);

  const repeatRecipes = useMemo(
    () => (archiveRecipes ?? []).filter((r) => r.verdict === "repeat"),
    [archiveRecipes],
  );

  const pool = source === "todo" ? (todoRecipes ?? []) : repeatRecipes;
  const poolLoading = source === "todo" ? todoLoading : archiveLoading;

  // 表示元(source)の切り替えやデータ読み込み完了でpoolの中身が変わったら選び直す。
  // useEffectではなく、レンダー中にpoolの内容を前回と比較して直接setStateする。
  const poolKey = pool.map((r) => r.id).join(",");
  const [prevPoolKey, setPrevPoolKey] = useState(poolKey);
  if (poolKey !== prevPoolKey) {
    setPrevPoolKey(poolKey);
    setPick(pickRandom(pool));
  }

  /** 直前と同じ候補は出さない。候補が1件しかなければ引き直せない旨を伝える。 */
  function handleReroll() {
    const others = pool.filter((r) => r.id !== pick?.id);
    if (others.length === 0) {
      toast("他の候補がありません");
      return;
    }
    setPick(others[Math.floor(Math.random() * others.length)]);
  }

  if (memberLoading) {
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

  const adderName = pick
    ? members?.find((m) => m.id === pick.added_by)?.display_name
    : undefined;
  const pickMeta = pick?.author_handle
    ? `@${pick.author_handle}`
    : adderName
      ? `${adderName}が追加`
      : "";

  return (
    <div className="ck-screen">
      <h1 className="ck-title mb-[18px]">今夜どうする</h1>

      <div
        className="flex overflow-hidden rounded-md border border-divider"
        role="group"
        aria-label="抽選元"
      >
        {(["todo", "repeat"] as const).map((value, index) => {
          const selected = source === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setSource(value)}
              className={`flex min-h-11 flex-1 items-center justify-center text-[14px] ${index === 1 ? "border-l border-divider" : ""}`}
              style={
                selected
                  ? {
                      background: "var(--color-accent)",
                      color: "var(--color-bg)",
                    }
                  : undefined
              }
            >
              {SOURCE_LABEL[value]}
            </button>
          );
        })}
      </div>

      {poolLoading ? (
        <p className="ck-meta py-8 text-center">読み込み中...</p>
      ) : pick ? (
        <div
          className="mt-11 flex flex-col items-center gap-3.5 text-center"
          style={{ paddingBottom: "calc(var(--tabbar-h) + 24px)" }}
        >
          <RecipeThumbnail
            photoPath={pick.photo_path}
            size={180}
            className="rounded-lg"
          />
          <p className="text-[14px] text-[rgba(32,30,29,.5)]">
            {SOURCE_LABEL[source]}
          </p>
          <p className="text-[24px] leading-[1.2] font-semibold tracking-[-0.015em]">
            {pick.title}
          </p>
          <div className="flex items-center gap-2.5">
            {pickMeta && <span className="ck-meta">{pickMeta}</span>}
            {pick.category && <CategoryTag category={pick.category} />}
          </div>

          <button
            type="button"
            onClick={handleReroll}
            className="ck-btn ck-btn-primary ck-pill mt-3.5 min-h-14 px-8 text-[17px]"
          >
            <Shuffle size={22} weight="duotone" />
            別のにする
          </button>
          <Link
            href={`/recipe/${pick.id}`}
            className="ck-btn ck-btn-ghost min-h-11 text-[15px]"
          >
            詳しく見る
          </Link>
        </div>
      ) : (
        <p
          className="ck-meta flex flex-1 items-center justify-center text-[15px]"
          style={{ paddingBottom: "calc(var(--tabbar-h) + 44px)" }}
        >
          {source === "todo"
            ? "未挑戦のレシピがありません"
            : "リピート確定のレシピがまだありません"}
        </p>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ArchiveRecipeCard } from "@/components/ArchiveRecipeCard";
import { useMyMember } from "@/lib/board";
import type { RecipeCategory } from "@/lib/database.types";
import { useArchiveRecipes, useBoardMembers } from "@/lib/recipes";

const CATEGORIES: RecipeCategory[] = ["主菜", "副菜", "汁物", "麺・丼", "おやつ"];

export default function ArchivePage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: recipes, isLoading: recipesLoading } = useArchiveRecipes(
    member?.board_id,
  );
  const { data: members } = useBoardMembers(member?.board_id);

  const [repeatOnly, setRepeatOnly] = useState(false);
  const [category, setCategory] = useState<RecipeCategory | null>(null);
  const [keyword, setKeyword] = useState("");

  const memberNames = new Map((members ?? []).map((m) => [m.id, m.display_name]));

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const kw = keyword.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (repeatOnly && recipe.verdict !== "repeat") return false;
      if (category && recipe.category !== category) return false;
      if (kw) {
        const haystack = `${recipe.title} ${recipe.memo ?? ""}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [recipes, repeatOnly, category, keyword]);

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
      <h1 className="text-xl font-semibold">アーカイブ</h1>

      <button
        type="button"
        onClick={() => setRepeatOnly((v) => !v)}
        className={`min-h-[48px] w-full rounded-xl text-base font-semibold ${
          repeatOnly
            ? "bg-orange-500 text-white"
            : "border border-zinc-300 text-zinc-600"
        }`}
      >
        {repeatOnly ? "✓ リピート確定のみ表示中" : "リピート確定のみ表示"}
      </button>

      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="タイトル・メモで検索"
        className="min-h-[44px] w-full rounded-lg border border-zinc-300 px-4 text-base"
      />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCategory((prev) => (prev === c ? null : c))}
            className={`min-h-[44px] rounded-full border px-4 text-sm font-medium ${
              category === c
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-zinc-300 text-zinc-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {recipesLoading ? (
        <p className="p-8 text-center text-sm text-zinc-500">読み込み中...</p>
      ) : filtered.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <ArchiveRecipeCard
                recipe={recipe}
                adderName={memberNames.get(recipe.added_by)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-8 text-center text-sm text-zinc-500">
          {recipes && recipes.length > 0
            ? "条件に合うレシピがありません"
            : "作ったレシピはまだありません"}
        </p>
      )}
    </div>
  );
}

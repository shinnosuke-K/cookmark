"use client";

import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useMemo, useState } from "react";
import { ArchiveRecipeCard } from "@/components/ArchiveRecipeCard";
import { CategoryChips } from "@/components/CategoryChips";
import { useMyMember } from "@/lib/board";
import type { RecipeCategory } from "@/lib/database.types";
import { useArchiveRecipes, useBoardMembers } from "@/lib/recipes";

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

  const listPadding = { paddingBottom: "calc(var(--tabbar-h) + 44px)" };

  return (
    <div className="ck-screen">
      <h1 className="ck-title mb-3.5">アーカイブ</h1>

      {/* リピート確定のみ表示。ONでマゼンタ100の地 + マゼンタ600のトラックになる */}
      <button
        type="button"
        role="switch"
        aria-checked={repeatOnly}
        onClick={() => setRepeatOnly((v) => !v)}
        className="flex min-h-12 items-center justify-between rounded-md px-3.5 py-1.5"
        style={{
          background: repeatOnly
            ? "var(--color-accent-2-100)"
            : "var(--color-neutral-200)",
        }}
      >
        <span
          className="text-[15px] font-semibold"
          style={{ color: "var(--color-accent-2-800)" }}
        >
          リピート確定のみ表示
        </span>
        <span
          className="ck-pill relative h-[30px] w-[50px] flex-none transition-colors duration-200"
          style={{
            background: repeatOnly
              ? "var(--color-accent-2-600)"
              : "var(--color-neutral-400)",
          }}
        >
          <span
            className="absolute top-[3px] size-6 rounded-full bg-white shadow-sm transition-[left] duration-200"
            style={{ left: repeatOnly ? "23px" : "3px" }}
          />
        </span>
      </button>

      <div className="relative mt-3">
        <MagnifyingGlass
          size={18}
          weight="duotone"
          color="#7d7979"
          className="absolute top-1/2 left-2.5 -translate-y-1/2"
        />
        <input
          className="ck-input min-h-11 pl-[34px]"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="タイトル・メモで検索"
          aria-label="タイトル・メモで検索"
          type="search"
        />
      </div>

      <div className="mt-3">
        <CategoryChips
          label="カテゴリで絞り込み"
          value={category}
          onChange={setCategory}
        />
      </div>

      {recipesLoading ? (
        <p className="ck-meta py-8 text-center">読み込み中...</p>
      ) : filtered.length > 0 ? (
        <ul className="mt-[26px] flex flex-col gap-6" style={listPadding}>
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
        <p
          className="ck-meta flex flex-1 items-center justify-center text-[15px]"
          style={listPadding}
        >
          {recipes && recipes.length > 0
            ? "条件に合うレシピがありません"
            : "作ったレシピはまだありません"}
        </p>
      )}
    </div>
  );
}

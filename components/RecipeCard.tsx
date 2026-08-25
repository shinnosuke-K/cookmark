"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useMarkRecipeCooked } from "@/lib/recipes";
import type { Recipe } from "@/lib/recipes";

interface RecipeCardProps {
  recipe: Recipe;
  adderName: string | undefined;
}

export function RecipeCard({ recipe, adderName }: RecipeCardProps) {
  const markCooked = useMarkRecipeCooked();

  function handleCooked() {
    markCooked.mutate(
      { id: recipe.id, boardId: recipe.board_id },
      {
        onError: () => toast.error("更新に失敗しました。もう一度お試しください"),
      },
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
      <Link
        href={`/recipe/${recipe.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {/*
          サムネイル: ユーザー写真のアップロードはTask4で実装される。
          photo_pathが付いたら Supabase Storageから createSignedUrl で
          署名付きURLを取得して表示する(photosバケットは非公開のため
          getPublicUrlは使えない)。それまでは常にプレースホルダー表示。
        */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl">
          🍳
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <p className="truncate text-base font-medium">{recipe.title}</p>
          <p className="truncate text-sm text-zinc-500">
            {[
              recipe.author_handle ? `@${recipe.author_handle}` : null,
              adderName ? `${adderName}が追加` : null,
            ]
              .filter(Boolean)
              .join(" ・ ")}
          </p>
          {recipe.category && (
            <span className="w-fit rounded-full bg-orange-50 px-2 py-0.5 text-sm text-orange-600">
              {recipe.category}
            </span>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={handleCooked}
        disabled={markCooked.isPending}
        className="min-h-[44px] shrink-0 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        作った!
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { CategoryTag } from "./CategoryChips";
import { CookedSheet } from "./CookedSheet";
import { RecipeThumbnail } from "./RecipeThumbnail";
import type { Recipe } from "@/lib/recipes";

interface RecipeCardProps {
  recipe: Recipe;
  adderName: string | undefined;
}

/**
 * 未挑戦リストの1行。カードも罫線も持たず、余白だけで隣の行と分かれる。
 * 行全体のタップで詳細へ(リンクを疑似要素で行いっぱいに広げる)、
 * 右端の「作った!」だけはその上に重ねてボトムシートを開く。
 */
export function RecipeCard({ recipe, adderName }: RecipeCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const subtitle = [
    recipe.author_handle ? `@${recipe.author_handle}` : null,
    adderName ? `${adderName}が追加` : null,
  ]
    .filter(Boolean)
    .join(" ・ ");

  return (
    <div className="relative flex items-center gap-3.5">
      <RecipeThumbnail photoPath={recipe.photo_path} size={64} />

      <div className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
        <Link
          href={`/recipe/${recipe.id}`}
          className="text-[17px] leading-[1.25] font-semibold after:absolute after:inset-0 after:content-['']"
        >
          {recipe.title}
        </Link>
        {subtitle && (
          <span className="ck-meta w-full truncate">{subtitle}</span>
        )}
        {recipe.category && <CategoryTag category={recipe.category} />}
      </div>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="ck-btn ck-btn-primary ck-pill relative z-10 min-h-11 flex-none text-[14px]"
      >
        作った!
      </button>

      {sheetOpen && (
        <CookedSheet recipe={recipe} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}

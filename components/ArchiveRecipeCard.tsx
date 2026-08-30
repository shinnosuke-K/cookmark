"use client";

import Link from "next/link";
import { CategoryTag } from "./CategoryChips";
import { RecipeThumbnail } from "./RecipeThumbnail";
import { VerdictBadge } from "./VerdictBadge";
import type { Recipe } from "@/lib/recipes";

interface ArchiveRecipeCardProps {
  recipe: Recipe;
  adderName: string | undefined;
}

/**
 * アーカイブの1行。ホームより一段小さいサムネイル・タイトルで、右端は評価バッジ。
 * カテゴリはホーム行と同じ配色タグで表示する。
 */
export function ArchiveRecipeCard({ recipe, adderName }: ArchiveRecipeCardProps) {
  const adderText = adderName ? `${adderName}が追加` : null;

  return (
    <div className="relative flex items-center gap-3.5">
      <RecipeThumbnail photoPath={recipe.photo_path} size={56} />

      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <Link
          href={`/recipe/${recipe.id}`}
          className="text-[16px] leading-[1.25] font-semibold after:absolute after:inset-0 after:content-['']"
        >
          {recipe.title}
        </Link>
        {(adderText || recipe.category) && (
          <div className="flex min-w-0 items-center gap-1.5">
            {adderText && <span className="ck-meta min-w-0 truncate">{adderText}</span>}
            {recipe.category && <CategoryTag category={recipe.category} />}
          </div>
        )}
      </div>

      <VerdictBadge verdict={recipe.verdict} count={recipe.cook_count} />
    </div>
  );
}

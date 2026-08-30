"use client";

import Link from "next/link";
import { RecipeThumbnail } from "./RecipeThumbnail";
import { VerdictBadge } from "./VerdictBadge";
import type { Recipe } from "@/lib/recipes";

interface ArchiveRecipeCardProps {
  recipe: Recipe;
  adderName: string | undefined;
}

/**
 * アーカイブの1行。ホームより一段小さいサムネイル・タイトルで、右端は評価バッジ。
 * カテゴリはタグではなく補助テキストに畳んで、行の要素数を抑える。
 */
export function ArchiveRecipeCard({ recipe, adderName }: ArchiveRecipeCardProps) {
  const subtitle = [
    adderName ? `${adderName}が追加` : null,
    recipe.category,
  ]
    .filter(Boolean)
    .join(" ・ ");

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
        {subtitle && <span className="ck-meta truncate">{subtitle}</span>}
      </div>

      <VerdictBadge verdict={recipe.verdict} />
    </div>
  );
}

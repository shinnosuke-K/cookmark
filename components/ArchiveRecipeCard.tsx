"use client";

import Link from "next/link";
import { RecipeThumbnail } from "./RecipeThumbnail";
import type { Recipe } from "@/lib/recipes";

const VERDICT_LABEL: Record<"repeat" | "meh", string> = {
  repeat: "リピート確定",
  meh: "イマイチ",
};

interface ArchiveRecipeCardProps {
  recipe: Recipe;
  adderName: string | undefined;
}

export function ArchiveRecipeCard({ recipe, adderName }: ArchiveRecipeCardProps) {
  const verdictLabel = recipe.verdict ? VERDICT_LABEL[recipe.verdict] : "未評価";
  const verdictClass =
    recipe.verdict === "repeat"
      ? "bg-orange-500 text-white"
      : recipe.verdict === "meh"
        ? "bg-zinc-200 text-zinc-600"
        : "bg-zinc-100 text-zinc-400";

  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
    >
      <RecipeThumbnail photoPath={recipe.photo_path} />

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

      <span
        className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${verdictClass}`}
      >
        {verdictLabel}
      </span>
    </Link>
  );
}

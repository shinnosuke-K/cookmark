"use client";

import Link from "next/link";
import { useState } from "react";
import { CookedSheet } from "./CookedSheet";
import { RecipeThumbnail } from "./RecipeThumbnail";
import type { Recipe } from "@/lib/recipes";

interface RecipeCardProps {
  recipe: Recipe;
  adderName: string | undefined;
}

export function RecipeCard({ recipe, adderName }: RecipeCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
      <Link
        href={`/recipe/${recipe.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
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
      </Link>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="min-h-[44px] shrink-0 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white"
      >
        作った!
      </button>

      <CookedSheet
        recipe={recipe}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

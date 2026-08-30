"use client";

import { CATEGORIES, categoryChipStyle, categoryStyle } from "@/lib/categories";
import type { RecipeCategory } from "@/lib/database.types";

/** 表示専用のカテゴリタグ(ホーム行・今夜・詳細のメタ)。 */
export function CategoryTag({
  category,
  className = "",
}: {
  category: RecipeCategory;
  className?: string;
}) {
  return (
    <span
      className={`ck-tag px-2.5 py-[3px] ${className}`}
      style={categoryStyle(category)}
    >
      {category}
    </span>
  );
}

interface CategoryChipsProps {
  value: RecipeCategory | null;
  onChange: (next: RecipeCategory | null) => void;
  /** チップ列のラベル(スクリーンリーダー向け) */
  label: string;
}

/**
 * カテゴリの単一選択チップ列。選択中のチップを再タップすると解除する。
 * 確定ボタンは無く、タップで即反映する。
 */
export function CategoryChips({ value, onChange, label }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {CATEGORIES.map((category) => {
        const selected = value === category;
        return (
          <button
            key={category}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : category)}
            className="ck-tag ck-chip px-3.5 py-1.5"
            style={categoryChipStyle(category, selected)}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

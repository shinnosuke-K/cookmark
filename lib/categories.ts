import type { CSSProperties } from "react";
import type { RecipeCategory } from "./database.types";

export const CATEGORIES: RecipeCategory[] = [
  "主菜",
  "副菜",
  "汁物",
  "麺・丼",
  "おやつ",
];

/**
 * カテゴリ5色。明度・彩度は固定して色相だけを変える(Broadsheetのタグ配色)。
 * 地 oklch(0.92 0.05 H) / 文字 oklch(0.4 0.1 H)。
 */
const CATEGORY_HUE: Record<RecipeCategory, number> = {
  主菜: 35,
  副菜: 145,
  汁物: 235,
  "麺・丼": 85,
  おやつ: 350,
};

export function categoryStyle(category: RecipeCategory): CSSProperties {
  const hue = CATEGORY_HUE[category];
  return {
    background: `oklch(0.92 0.05 ${hue})`,
    color: `oklch(0.4 0.1 ${hue})`,
  };
}

/**
 * 選択可能なチップの見た目。選択中は同色2pxのリング、非選択は少し落とす。
 */
export function categoryChipStyle(
  category: RecipeCategory,
  selected: boolean,
): CSSProperties {
  const hue = CATEGORY_HUE[category];
  return {
    ...categoryStyle(category),
    ...(selected
      ? { boxShadow: `0 0 0 2px oklch(0.4 0.1 ${hue})` }
      : { opacity: 0.75 }),
  };
}

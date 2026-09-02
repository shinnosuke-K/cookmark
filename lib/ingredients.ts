/**
 * 食材はDBにカンマ区切りの1カラム(`recipes.ingredients`)で保存し、UIでは
 * チップの配列として扱う。ここはその相互変換と、候補チップ用の頻度集計。
 */

/** カンマ区切り文字列 → チップ配列。「,」と全角「、」の両方を区切りとして扱う。 */
export function splitIngredients(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,、]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

/** チップ配列 → 保存用のカンマ区切り文字列。空配列はnull(未登録)。 */
export function joinIngredients(items: string[]): string | null {
  const cleaned = normalizeIngredients(items);
  return cleaned.length > 0 ? cleaned.join(", ") : null;
}

/** 前後の空白を落とし、空文字と重複を除く。 */
export function normalizeIngredients(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/**
 * ボード内の全レシピの食材を頻度順に集計し、既に追加済みのものを除いた上位を返す
 * (「よく使う:」候補チップ)。
 */
export function frequentIngredients(
  allIngredients: (string | null)[],
  exclude: string[],
  limit = 5,
): string[] {
  const counts = new Map<string, number>();
  for (const value of allIngredients) {
    for (const token of splitIngredients(value)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const excluded = new Set(exclude);
  return [...counts.entries()]
    .filter(([token]) => !excluded.has(token))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

// Instagram投稿のキャプションから料理名・カテゴリ・食材(と分量)をClaudeで抜き出すサーバー専用
// ユーティリティ。自動取得の一部なのでベストエフォート: APIキー未設定・タイムアウト・
// 拒否・想定外の出力はすべてnullを返し、呼び出し側(app/api/og/route.ts)は正規表現で
// 得た結果にフォールバックする(この関数は例外を投げない)。

import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "./categories";
import type { RecipeCategory } from "./database.types";
import { normalizeIngredients } from "./ingredients";
import { truncateToCodePoints } from "./instagram-embed";
import promptTemplate from "./prompts/recipe-structurer.txt";

const MODEL = "claude-haiku-5-5";
// フォームの事前入力を待たせすぎないための上限。超えたら正規表現の結果で返す。
const REQUEST_TIMEOUT_MS = 8000;
const MAX_TITLE_LENGTH = 80;
const MAX_INGREDIENTS = 8;
const MAX_AMOUNT_LENGTH = 20;
const UNKNOWN_CATEGORY = "不明";

export interface StructuredRecipe {
  /** 料理名。キャプションから判断できなかった場合は空文字。 */
  title: string;
  category: RecipeCategory | null;
  ingredients: string[];
  /** 食材名 → 分量。キャプションに分量の記載があった食材のみ。 */
  ingredientAmounts: Record<string, string>;
}

// プロンプト本文は lib/prompts/recipe-structurer.txt で管理する。カテゴリの一覧などコードと
// 一致していなければならない値だけ、{{名前}} のプレースホルダーにしてここで埋める。
const SYSTEM_PROMPT = promptTemplate
  .trim()
  .replace("{{categories}}", `「${CATEGORIES.join("」「")}」`)
  .replace("{{unknownCategory}}", UNKNOWN_CATEGORY)
  .replace("{{maxIngredients}}", String(MAX_INGREDIENTS));

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    category: { type: "string", enum: [...CATEGORIES, UNKNOWN_CATEGORY] },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, amount: { type: "string" } },
        required: ["name", "amount"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "category", "ingredients"],
  additionalProperties: false,
};

let client: Anthropic | null = null;

function isCategory(value: unknown): value is RecipeCategory {
  return (CATEGORIES as unknown[]).includes(value);
}

function isIngredientItem(value: unknown): value is { name: string; amount: string } {
  if (typeof value !== "object" || value === null) return false;
  const { name, amount } = value as Record<string, unknown>;
  return typeof name === "string" && typeof amount === "string";
}

export async function structureRecipe(caption: string): Promise<StructuredRecipe | null> {
  if (!process.env.ANTHROPIC_API_KEY || caption.trim() === "") return null;
  client ??= new Anthropic({ timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });

  try {
    const response = await client.messages.create({
      model: MODEL,
      // 思考トークンもここに含まれるため、短い出力でも余裕を持たせる。
      max_tokens: 2048,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `<caption>\n${caption}\n</caption>` }],
    });
    if (response.stop_reason !== "end_turn") return null;

    const text = response.content.find((block) => block.type === "text")?.text;
    if (!text) return null;
    const output: unknown = JSON.parse(text);
    if (typeof output !== "object" || output === null) return null;
    const { title, category, ingredients } = output as Record<string, unknown>;

    const items = (Array.isArray(ingredients) ? ingredients : []).filter(isIngredientItem);
    const names = normalizeIngredients(items.map((item) => item.name)).slice(0, MAX_INGREDIENTS);
    const ingredientAmounts: Record<string, string> = {};
    for (const item of items) {
      const name = item.name.trim();
      const amount = truncateToCodePoints(item.amount.trim(), MAX_AMOUNT_LENGTH);
      if (amount && names.includes(name)) ingredientAmounts[name] ??= amount;
    }

    return {
      title: typeof title === "string" ? truncateToCodePoints(title.trim(), MAX_TITLE_LENGTH) : "",
      category: isCategory(category) ? category : null,
      ingredients: names,
      ingredientAmounts,
    };
  } catch (err) {
    console.warn(
      "レシピの構造化に失敗しました",
      err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err,
    );
    return null;
  }
}

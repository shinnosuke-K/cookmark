// Instagram投稿のキャプションから料理名・カテゴリ・食材・調味料(と分量)をClaudeで抜き出すサーバー専用
// ユーティリティ。自動取得の一部なのでベストエフォート: 認証の未設定・失敗、タイムアウト、
// 拒否・想定外の出力はすべてnullを返し、呼び出し側(app/api/og/route.ts)は正規表現で
// 得た結果にフォールバックする(この関数は例外を投げない)。

import Anthropic from "@anthropic-ai/sdk";
import { oidcFederationProvider } from "@anthropic-ai/sdk/lib/credentials/oidc-federation";
import { getVercelOidcToken } from "@vercel/oidc";
import { CATEGORIES } from "./categories";
import type { RecipeCategory, Seasoning } from "./database.types";
import { normalizeIngredients } from "./ingredients";
import { truncateToCodePoints } from "./instagram-embed";
import promptTemplate from "./prompts/recipe-structurer.txt";

const MODEL = "claude-haiku-5-5";
// フォームの事前入力を待たせすぎないための上限。超えたら正規表現の結果で返す。
const REQUEST_TIMEOUT_MS = 8000;
const MAX_TITLE_LENGTH = 80;
const MAX_INGREDIENTS = 8;
const MAX_AMOUNT_LENGTH = 20;
const MAX_SEASONINGS = 15;
const MAX_SEASONING_NAME_LENGTH = 20;
const UNKNOWN_CATEGORY = "不明";

export interface StructuredRecipe {
  /** 料理名。キャプションから判断できなかった場合は空文字。 */
  title: string;
  category: RecipeCategory | null;
  ingredients: string[];
  /** 食材名 → 分量。キャプションに分量の記載があった食材のみ。 */
  ingredientAmounts: Record<string, string>;
  /** 調味料と分量(記載順)。 */
  seasonings: Seasoning[];
}

// プロンプト本文は lib/prompts/recipe-structurer.txt で管理する。カテゴリの一覧などコードと
// 一致していなければならない値だけ、{{名前}} のプレースホルダーにしてここで埋める。
const SYSTEM_PROMPT = promptTemplate
  .trim()
  .replace("{{categories}}", `「${CATEGORIES.join("」「")}」`)
  .replace("{{unknownCategory}}", UNKNOWN_CATEGORY)
  .replace("{{maxIngredients}}", String(MAX_INGREDIENTS))
  .replace("{{maxSeasonings}}", String(MAX_SEASONINGS));

const NAME_AMOUNT_LIST_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: { name: { type: "string" }, amount: { type: "string" } },
    required: ["name", "amount"],
    additionalProperties: false,
  },
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    category: { type: "string", enum: [...CATEGORIES, UNKNOWN_CATEGORY] },
    ingredients: NAME_AMOUNT_LIST_SCHEMA,
    seasonings: NAME_AMOUNT_LIST_SCHEMA,
  },
  required: ["title", "category", "ingredients", "seasonings"],
  additionalProperties: false,
};

const ANTHROPIC_BASE_URL = "https://api.anthropic.com";
const TOKEN_EXCHANGE_TIMEOUT_MS = 5000;

let client: Anthropic | null = null;

/**
 * Claude APIのクライアントを作る。認証は2通りで、どちらも設定が無ければnull(構造化しない)。
 *
 * - 本番(Vercel): Workload Identity Federation。Vercelが関数に発行する短命のOIDCトークンを
 *   Anthropicのアクセストークンに交換する。長期間有効なAPIキーをVercelに置かずに済み、
 *   Anthropic側のルールで「このプロジェクトのproduction環境」だけに絞れる。
 *   `ANTHROPIC_FEDERATION_RULE_ID` と `ANTHROPIC_ORGANIZATION_ID` があればこちらを使う
 *   (どちらもIDであって秘密ではない)。
 * - ローカル開発: `.env.local` の `ANTHROPIC_API_KEY`。
 */
function createClient(): Anthropic | null {
  const options = { timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 };
  const federationRuleId = process.env.ANTHROPIC_FEDERATION_RULE_ID;
  const organizationId = process.env.ANTHROPIC_ORGANIZATION_ID;

  if (federationRuleId && organizationId) {
    return new Anthropic({
      ...options,
      // credentials を渡すと、SDKは環境変数のAPIキーを読まず、交換したトークンを
      // 期限までキャッシュして使い回す。
      credentials: oidcFederationProvider({
        // トークンはリクエストごとにVercelから届くので、交換のたびに取り直す。
        identityTokenProvider: () => getVercelOidcToken(),
        federationRuleId,
        organizationId,
        serviceAccountId: process.env.ANTHROPIC_SERVICE_ACCOUNT_ID,
        workspaceId: process.env.ANTHROPIC_WORKSPACE_ID,
        baseURL: ANTHROPIC_BASE_URL,
        // SDKのトークン交換にはタイムアウトが無いので、ここで付ける(超えたら正規表現の結果で返す)。
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS) }),
      }),
    });
  }

  return process.env.ANTHROPIC_API_KEY ? new Anthropic(options) : null;
}

function isCategory(value: unknown): value is RecipeCategory {
  return (CATEGORIES as unknown[]).includes(value);
}

function isNameAmount(value: unknown): value is { name: string; amount: string } {
  if (typeof value !== "object" || value === null) return false;
  const { name, amount } = value as Record<string, unknown>;
  return typeof name === "string" && typeof amount === "string";
}

export async function structureRecipe(caption: string): Promise<StructuredRecipe | null> {
  if (caption.trim() === "") return null;
  client ??= createClient();
  if (!client) return null;

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
    const { title, category, ingredients, seasonings } = output as Record<string, unknown>;

    const items = (Array.isArray(ingredients) ? ingredients : []).filter(isNameAmount);
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
      seasonings: (Array.isArray(seasonings) ? seasonings : [])
        .filter(isNameAmount)
        .map((item) => ({
          name: truncateToCodePoints(item.name.trim(), MAX_SEASONING_NAME_LENGTH),
          amount: truncateToCodePoints(item.amount.trim(), MAX_AMOUNT_LENGTH),
        }))
        .filter((item) => item.name !== "")
        .slice(0, MAX_SEASONINGS),
    };
  } catch (err) {
    console.warn(
      "レシピの構造化に失敗しました",
      err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err,
    );
    return null;
  }
}

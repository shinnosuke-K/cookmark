"use client";

import { useState } from "react";
import { toast } from "sonner";
import { parseInstagramUrl } from "@/lib/instagram";
import { useAddRecipe } from "@/lib/recipes";
import type { RecipeCategory } from "@/lib/database.types";

const CATEGORIES: RecipeCategory[] = ["主菜", "副菜", "汁物", "麺・丼", "おやつ"];

export interface AddRecipeFormInitial {
  url: string;
  title: string;
  authorHandle: string;
  category: RecipeCategory | null;
}

interface AddRecipeFormProps {
  boardId: string;
  memberId: string;
  initial: AddRecipeFormInitial;
  onClose: () => void;
}

/**
 * 貼り付けバナー・共有シート受け(share_target)の両方から開かれる追加フォーム。
 * InstagramのURLが解析できてもできなくても、タイトルさえ入れれば追加できる。
 */
export function AddRecipeForm({
  boardId,
  memberId,
  initial,
  onClose,
}: AddRecipeFormProps) {
  const [url, setUrl] = useState(initial.url);
  const [title, setTitle] = useState(initial.title);
  const [authorHandle, setAuthorHandle] = useState(initial.authorHandle);
  const [category, setCategory] = useState<RecipeCategory | null>(
    initial.category,
  );
  const addRecipe = useAddRecipe();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("タイトルを入力してください");
      return;
    }

    const parsed = parseInstagramUrl(url);
    addRecipe.mutate(
      {
        boardId,
        addedBy: memberId,
        title: trimmedTitle,
        authorHandle: authorHandle.trim() || null,
        category,
        instagramUrl: parsed?.cleanUrl ?? null,
        postShortcode: parsed?.shortcode ?? null,
      },
      {
        onSuccess: () => {
          toast.success("レシピを追加しました");
          onClose();
        },
        onError: () => {
          toast.error("追加に失敗しました。もう一度お試しください");
        },
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-6 sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">レシピを追加</h2>

        <div>
          <label
            htmlFor="recipe-url"
            className="block text-sm font-medium text-zinc-700"
          >
            InstagramのURL(任意)
          </label>
          <input
            id="recipe-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base"
          />
        </div>

        <div>
          <label
            htmlFor="recipe-title"
            className="block text-sm font-medium text-zinc-700"
          >
            タイトル
          </label>
          <input
            id="recipe-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 鶏むね肉のねぎ塩レモン"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base"
            autoFocus
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-zinc-700">
            カテゴリ(任意)
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory((prev) => (prev === c ? null : c))}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-medium ${
                  category === c
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-zinc-300 text-zinc-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="recipe-author"
            className="block text-sm font-medium text-zinc-700"
          >
            投稿者ハンドル(任意)
          </label>
          <input
            id="recipe-author"
            value={authorHandle}
            onChange={(e) => setAuthorHandle(e.target.value)}
            placeholder="例: foodie_taro"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-lg border border-zinc-300 text-base font-semibold text-zinc-600"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={addRecipe.isPending}
            className="min-h-[44px] flex-1 rounded-lg bg-orange-500 text-base font-semibold text-white disabled:opacity-50"
          >
            {addRecipe.isPending ? "追加中..." : "追加する"}
          </button>
        </div>
      </form>
    </div>
  );
}

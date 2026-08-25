"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { InstagramEmbed } from "@/components/InstagramEmbed";
import { RecipeThumbnail } from "@/components/RecipeThumbnail";
import type { RecipeCategory } from "@/lib/database.types";
import { uploadRecipePhoto } from "@/lib/photos";
import { useDeleteRecipe, useRecipe, useUpdateRecipe } from "@/lib/recipes";

const CATEGORIES: RecipeCategory[] = ["主菜", "副菜", "汁物", "麺・丼", "おやつ"];

const VERDICT_LABEL: Record<"repeat" | "meh", string> = {
  repeat: "リピート確定",
  meh: "イマイチ",
};

export default function RecipeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipe(params.id);
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();

  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [category, setCategory] = useState<RecipeCategory | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // recipeが読み込まれた/切り替わったタイミングで編集フォームの初期値をセットする。
  // useEffectではなく、レンダー中にidの変化を検知して直接setStateする
  // (CookedSheetのprevOpenと同じ「propの変化に応じてstateを調整する」パターン)。
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (recipe && recipe.id !== loadedId) {
    setLoadedId(recipe.id);
    setTitle(recipe.title);
    setMemo(recipe.memo ?? "");
    setCategory(recipe.category);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!recipe) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("タイトルを入力してください");
      return;
    }

    let photoPath: string | undefined;
    if (photoFile) {
      setUploading(true);
      try {
        photoPath = await uploadRecipePhoto({
          boardId: recipe.board_id,
          recipeId: recipe.id,
          file: photoFile,
        });
      } catch {
        toast.error("写真のアップロードに失敗しました");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    updateRecipe.mutate(
      {
        id: recipe.id,
        boardId: recipe.board_id,
        title: trimmedTitle,
        memo: memo.trim() || null,
        category,
        photoPath,
      },
      {
        onSuccess: () => toast.success("保存しました"),
        onError: () =>
          toast.error("保存に失敗しました。もう一度お試しください"),
      },
    );
  }

  function handleDelete() {
    if (!recipe) return;
    if (!window.confirm("このレシピを削除しますか?元に戻せません")) return;

    deleteRecipe.mutate(
      { id: recipe.id, boardId: recipe.board_id },
      {
        onSuccess: () => {
          toast.success("削除しました");
          router.push("/");
        },
        onError: () =>
          toast.error("削除に失敗しました。もう一度お試しください"),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        読み込み中...
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-zinc-500">
        <p>レシピが見つかりません</p>
        <Link href="/" className="font-medium text-orange-600 underline">
          ホームへ戻る
        </Link>
      </div>
    );
  }

  const statusLabel =
    recipe.status === "cooked"
      ? recipe.verdict
        ? VERDICT_LABEL[recipe.verdict]
        : "作った(未評価)"
      : "未挑戦";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pb-10">
      <Link href="/" className="text-sm text-zinc-500">
        ← ホームへ戻る
      </Link>

      <div className="flex items-start gap-3">
        <RecipeThumbnail photoPath={recipe.photo_path} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">{recipe.title}</h1>
          {recipe.author_handle && (
            <p className="truncate text-sm text-zinc-500">
              @{recipe.author_handle}
            </p>
          )}
          <span className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-sm text-orange-600">
            {statusLabel}
          </span>
        </div>
      </div>

      {recipe.instagram_url && (
        <a
          href={recipe.instagram_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-orange-600 underline"
        >
          Instagramで開く
        </a>
      )}

      {recipe.post_shortcode && (
        <InstagramEmbed shortcode={recipe.post_shortcode} />
      )}

      <section className="space-y-4 rounded-xl border border-zinc-200 p-4">
        <h2 className="text-base font-semibold">編集</h2>

        <div>
          <label
            htmlFor="edit-title"
            className="block text-sm font-medium text-zinc-700"
          >
            タイトル
          </label>
          <input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-zinc-700">
            カテゴリ
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
            htmlFor="edit-memo"
            className="block text-sm font-medium text-zinc-700"
          >
            メモ
          </label>
          <textarea
            id="edit-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="味付けのメモなど"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base"
          />
        </div>

        <div>
          <label
            htmlFor="edit-photo"
            className="block text-sm font-medium text-zinc-700"
          >
            写真
          </label>
          <input
            id="edit-photo"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="mt-1 w-full text-sm"
          />
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element -- ローカルファイルのプレビュー用objectURL
            <img
              src={photoPreview}
              alt=""
              className="mt-2 h-24 w-24 rounded-lg object-cover"
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={updateRecipe.isPending || uploading}
          className="min-h-[44px] w-full rounded-lg bg-orange-500 text-base font-semibold text-white disabled:opacity-50"
        >
          {updateRecipe.isPending || uploading ? "保存中..." : "保存する"}
        </button>
      </section>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteRecipe.isPending}
        className="min-h-[44px] w-full rounded-lg border border-red-300 text-base font-semibold text-red-600 disabled:opacity-50"
      >
        削除する
      </button>
    </div>
  );
}

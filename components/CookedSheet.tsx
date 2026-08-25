"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { useMarkRecipeCooked } from "@/lib/recipes";
import { uploadRecipePhoto } from "@/lib/photos";
import type { Recipe } from "@/lib/recipes";
import type { RecipeVerdict } from "@/lib/database.types";

interface CookedSheetProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 「作った!」ボトムシート。
 * 「リピート確定」「イマイチ」どちらかを押すと、その評価 + 任意のメモ/写真を保存して
 * 即クローズする。押さずにスワイプ/オーバーレイタップで閉じた場合も、「作った」自体は
 * ボタンタップ時点で確定しているとみなし verdict=null で保存する(押下後の自動クローズで
 * 二重保存しないよう choiceMade state で判定する)。
 */
export function CookedSheet({ recipe, open, onOpenChange }: CookedSheetProps) {
  const markCooked = useMarkRecipeCooked();
  const [memo, setMemo] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [choiceMade, setChoiceMade] = useState(false);

  // シートが再び開かれたタイミングで前回の入力をリセットする。useEffectではなく
  // レンダー中にprevOpenと比較して直接setStateする(Reactが推奨する
  // 「propの変化に応じてstateを調整する」パターン)。
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setChoiceMade(false);
      setMemo("");
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleChoice(verdict: RecipeVerdict) {
    setChoiceMade(true);

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
        toast.error("写真のアップロードに失敗しました。他の内容は保存します");
      } finally {
        setUploading(false);
      }
    }

    markCooked.mutate(
      {
        id: recipe.id,
        boardId: recipe.board_id,
        verdict,
        memo: memo.trim() || null,
        photoPath,
      },
      {
        onError: () => toast.error("保存に失敗しました。もう一度お試しください"),
      },
    );
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next && !choiceMade) {
      // 選ばずに閉じた場合も「作った!」タップ自体は確定として保存する
      setChoiceMade(true);
      markCooked.mutate(
        { id: recipe.id, boardId: recipe.board_id, verdict: null },
        {
          onError: () => toast.error("保存に失敗しました。もう一度お試しください"),
        },
      );
    }
    onOpenChange(next);
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 flex max-h-[90vh] flex-col rounded-t-2xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <Drawer.Title className="text-lg font-semibold">
            {recipe.title}
          </Drawer.Title>
          <Drawer.Description className="mt-1 text-sm text-zinc-500">
            また作りたい?
          </Drawer.Description>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleChoice("repeat")}
              disabled={markCooked.isPending || uploading}
              className="min-h-[56px] rounded-xl bg-orange-500 text-base font-semibold text-white disabled:opacity-50"
            >
              リピート確定
            </button>
            <button
              type="button"
              onClick={() => handleChoice("meh")}
              disabled={markCooked.isPending || uploading}
              className="min-h-[56px] rounded-xl border border-zinc-300 text-base font-semibold text-zinc-600 disabled:opacity-50"
            >
              イマイチ
            </button>
          </div>

          <div className="mt-4">
            <label
              htmlFor="cooked-memo"
              className="block text-sm font-medium text-zinc-700"
            >
              メモ(任意)
            </label>
            <textarea
              id="cooked-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder="味付けのメモなど"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base"
            />
          </div>

          <div className="mt-3">
            <label
              htmlFor="cooked-photo"
              className="block text-sm font-medium text-zinc-700"
            >
              写真(任意)
            </label>
            <input
              id="cooked-photo"
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

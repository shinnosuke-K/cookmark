"use client";

import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { Camera } from "@phosphor-icons/react/dist/csr/Camera";
import { HandPalm } from "@phosphor-icons/react/dist/csr/HandPalm";
import { useRef, useState } from "react";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { uploadRecipePhoto } from "@/lib/photos";
import { useMarkRecipeCooked, type Recipe } from "@/lib/recipes";
import type { RecipeVerdict } from "@/lib/database.types";

interface CookedSheetProps {
  recipe: Recipe;
  onClose: () => void;
}

const VERDICT_TOAST: Record<"repeat" | "meh", string> = {
  repeat: "リピート確定で保存しました",
  meh: "イマイチで保存しました",
};

/**
 * 「作った!」ボトムシート。
 * 「リピート確定」「イマイチ」どちらかを押すと、その評価 + 任意のメモ/写真を保存して
 * 即クローズする。押さずに背景タップ/Escape/ハンドルで閉じた場合も、「作った」自体は
 * ボタンタップ時点で確定しているとみなし verdict=null で保存する
 * (押下後のクローズで二重保存しないよう choiceMade で判定する)。
 */
export function CookedSheet({ recipe, onClose }: CookedSheetProps) {
  const toast = useToast();
  const markCooked = useMarkRecipeCooked();
  const [memo, setMemo] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const choiceMadeRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleChoice(verdict: RecipeVerdict) {
    if (choiceMadeRef.current) return;
    choiceMadeRef.current = true;

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
        toast("写真のアップロードに失敗しました。他の内容は保存します");
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
        onSuccess: () => toast(VERDICT_TOAST[verdict]),
        onError: () => toast("保存に失敗しました。もう一度お試しください"),
      },
    );
    onClose();
  }

  function handleDismiss() {
    if (!choiceMadeRef.current) {
      // 選ばずに閉じた場合も「作った!」タップ自体は確定として保存する
      choiceMadeRef.current = true;
      markCooked.mutate(
        { id: recipe.id, boardId: recipe.board_id, verdict: null },
        {
          onSuccess: () => toast("作った!を保存しました(未評価)"),
          onError: () => toast("保存に失敗しました。もう一度お試しください"),
        },
      );
    }
    onClose();
  }

  const busy = markCooked.isPending || uploading;

  return (
    <Sheet label={recipe.title} onClose={handleDismiss}>
      <p className="text-[23px] leading-[1.15] font-semibold">{recipe.title}</p>
      <p className="mt-1 mb-5 text-[15px] text-[rgba(32,30,29,.6)]">
        また作りたい?
      </p>

      <div className="mb-[22px] flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => handleChoice("repeat")}
          className="ck-btn ck-btn-primary min-h-16 flex-1 flex-col gap-0.5 text-[17px]"
        >
          <ArrowsClockwise size={24} weight="duotone" />
          リピート確定
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleChoice("meh")}
          className="ck-btn ck-btn-secondary min-h-16 flex-1 flex-col gap-0.5 text-[17px]"
        >
          <HandPalm size={24} weight="duotone" />
          イマイチ
        </button>
      </div>

      <div className="mb-4">
        <label className="ck-label" htmlFor="cooked-memo">
          メモ(任意)
        </label>
        <textarea
          id="cooked-memo"
          className="ck-input min-h-16"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="味付けのメモなど"
        />
      </div>

      <div>
        <span className="ck-label">写真(任意)</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="ck-btn ck-btn-secondary min-h-12 w-full text-[15px]"
        >
          <Camera size={20} weight="duotone" />
          {photoFile ? "写真を変更" : "写真を追加"}
        </button>
        {photoPreview && (
          // 選択直後のローカルプレビュー(object URL)なのでnext/imageには載せない
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt=""
            className="mt-2.5 h-24 w-24 rounded-md object-cover"
          />
        )}
      </div>

      <p className="mt-4 text-center text-[14px] text-[rgba(32,30,29,.5)]">
        選ばず閉じても「作った」は保存されます(未評価)
      </p>
    </Sheet>
  );
}

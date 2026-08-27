"use client";

import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";
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
 * 即クローズする。押さずにスワイプ/オーバーレイタップ/Escapeで閉じた場合も、「作った」
 * 自体はボタンタップ時点で確定しているとみなし verdict=null で保存する(押下後の
 * 自動クローズで二重保存しないよう choiceMade state で判定する)。
 */
export function CookedSheet({ recipe, open, onOpenChange }: CookedSheetProps) {
  const toast = useToast();
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

  function handlePhotoChange(files: File | File[] | null) {
    const file = Array.isArray(files) ? (files[0] ?? null) : files;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
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
        toast({
          type: "error",
          body: "写真のアップロードに失敗しました。他の内容は保存します",
        });
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
        onError: () =>
          toast({ type: "error", body: "保存に失敗しました。もう一度お試しください" }),
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
          onError: () =>
            toast({ type: "error", body: "保存に失敗しました。もう一度お試しください" }),
        },
      );
    }
    onOpenChange(next);
  }

  return (
    <BottomSheet
      label={recipe.title}
      isOpen={open}
      onOpenChange={handleOpenChange}
      height="tall"
    >
      <VStack gap={4} padding={4}>
        <VStack gap={0.5}>
          <Heading level={2}>{recipe.title}</Heading>
          <Text type="body" color="secondary">
            また作りたい?
          </Text>
        </VStack>

        <HStack gap={3}>
          <Button
            label="リピート確定"
            variant="primary"
            size="lg"
            className="min-h-14 flex-1"
            isDisabled={markCooked.isPending || uploading}
            onClick={() => handleChoice("repeat")}
          />
          <Button
            label="イマイチ"
            variant="secondary"
            size="lg"
            className="min-h-14 flex-1"
            isDisabled={markCooked.isPending || uploading}
            onClick={() => handleChoice("meh")}
          />
        </HStack>

        <TextArea
          label="メモ(任意)"
          value={memo}
          onChange={setMemo}
          rows={2}
          placeholder="味付けのメモなど"
        />

        <VStack gap={2}>
          <FileInput
            label="写真(任意)"
            accept="image/*"
            value={photoFile}
            onChange={handlePhotoChange}
          />
          {photoPreview && (
            <Thumbnail
              src={photoPreview}
              alt=""
              onRemove={() => handlePhotoChange(null)}
              className="h-24 w-24"
            />
          )}
        </VStack>
      </VStack>
    </BottomSheet>
  );
}

"use client";

import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect, useRef, useState } from "react";
import { fetchOgData, parseInstagramUrl, type OgData } from "@/lib/instagram";
import { uploadRecipePhoto } from "@/lib/photos";
import { useAddRecipe, useUpdateRecipe, type Recipe } from "@/lib/recipes";
import type { RecipeCategory } from "@/lib/database.types";

const OG_CAPTION_MAX_LENGTH = 2000;

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
 * 呼び出し側が条件付きレンダーで開閉するため、BottomSheetは常時isOpenのまま
 * マウントし、閉じる操作(スワイプ/オーバーレイタップ/Escape/キャンセル)は
 * すべてonCloseへ委譲する。
 */
export function AddRecipeForm({
  boardId,
  memberId,
  initial,
  onClose,
}: AddRecipeFormProps) {
  const toast = useToast();
  const [url, setUrl] = useState(initial.url);
  const [title, setTitle] = useState(initial.title);
  const [authorHandle, setAuthorHandle] = useState(initial.authorHandle);
  const [category, setCategory] = useState<RecipeCategory | null>(
    initial.category,
  );
  const addRecipe = useAddRecipe();
  const updateRecipe = useUpdateRecipe();

  // Instagram自動取得(ベストエフォート)。フォームが開いた時点のURLにshortcodeが
  // 含まれていれば、フォームをブロックせずバックグラウンドで取得する。結果は
  // タイトル・投稿者が未入力のときだけ流し込み、キャプション・画像URLは追加確定時の
  // 後処理(handleSubmit)で使うためrefに保持しておく。
  const ogDataRef = useRef<OgData | null>(null);

  useEffect(() => {
    const parsed = parseInstagramUrl(initial.url);
    if (!parsed) return;

    let cancelled = false;
    fetchOgData(parsed.shortcode).then((data) => {
      if (cancelled || !data) return;
      ogDataRef.current = data;
      setTitle((prev) => (prev.trim() === "" ? data.title : prev));
      const handle = data.authorHandle;
      if (handle) {
        setAuthorHandle((prev) => (prev.trim() === "" ? handle : prev));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initial.url]);

  // 追加確定後、自動取得した画像があればダウンロード→圧縮アップロード→photo_path更新まで
  // バックグラウンドで行う。どこで失敗してもレシピ自体は正常に登録済みなので握りつぶす。
  async function attachOgPhoto(recipe: Recipe, imageUrl: string) {
    try {
      const res = await fetch(`/api/og/image?url=${encodeURIComponent(imageUrl)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const file = new File([blob], "instagram.jpg", { type: blob.type || "image/jpeg" });
      const photoPath = await uploadRecipePhoto({
        boardId: recipe.board_id,
        recipeId: recipe.id,
        file,
      });
      updateRecipe.mutate({
        id: recipe.id,
        boardId: recipe.board_id,
        title: recipe.title,
        memo: recipe.memo,
        category: recipe.category,
        photoPath,
      });
    } catch (err) {
      console.warn("Instagramの画像取得に失敗しました", err);
    }
  }

  function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({ type: "error", body: "タイトルを入力してください" });
      return;
    }

    const parsed = parseInstagramUrl(url);
    const ogData = ogDataRef.current;
    addRecipe.mutate(
      {
        boardId,
        addedBy: memberId,
        title: trimmedTitle,
        authorHandle: authorHandle.trim() || null,
        category,
        instagramUrl: parsed?.cleanUrl ?? null,
        postShortcode: parsed?.shortcode ?? null,
        memo: ogData?.caption ? ogData.caption.slice(0, OG_CAPTION_MAX_LENGTH) : null,
      },
      {
        onSuccess: (recipe) => {
          toast({ body: "レシピを追加しました" });
          onClose();
          if (ogData?.imageUrl) {
            void attachOgPhoto(recipe, ogData.imageUrl);
          }
        },
        onError: () => {
          toast({ type: "error", body: "追加に失敗しました。もう一度お試しください" });
        },
      },
    );
  }

  return (
    <BottomSheet
      label="レシピを追加"
      isOpen
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      height="tall"
    >
      <VStack gap={4} padding={4}>
        <Heading level={2}>レシピを追加</Heading>

        <TextInput
          label="InstagramのURL(任意)"
          value={url}
          onChange={setUrl}
          onEnter={handleSubmit}
          placeholder="https://www.instagram.com/p/..."
        />

        <TextInput
          label="タイトル"
          value={title}
          onChange={setTitle}
          onEnter={handleSubmit}
          placeholder="例: 鶏むね肉のねぎ塩レモン"
          hasAutoFocus
        />

        <VStack gap={2}>
          <Text type="label">カテゴリ(任意)</Text>
          <ToggleButtonGroup
            label="カテゴリ"
            value={category}
            onChange={(value) => setCategory(value as RecipeCategory | null)}
          >
            {CATEGORIES.map((c) => (
              <ToggleButton key={c} value={c} label={c} />
            ))}
          </ToggleButtonGroup>
        </VStack>

        <TextInput
          label="投稿者ハンドル(任意)"
          value={authorHandle}
          onChange={setAuthorHandle}
          onEnter={handleSubmit}
          placeholder="例: foodie_taro"
        />

        <HStack gap={3}>
          <Button
            label="キャンセル"
            variant="secondary"
            size="lg"
            className="min-h-11 flex-1"
            onClick={onClose}
          />
          <Button
            label={addRecipe.isPending ? "追加中..." : "追加する"}
            variant="primary"
            size="lg"
            className="min-h-11 flex-1"
            isDisabled={addRecipe.isPending}
            onClick={handleSubmit}
          />
        </HStack>
      </VStack>
    </BottomSheet>
  );
}

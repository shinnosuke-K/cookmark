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
import { useState } from "react";
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

  function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({ type: "error", body: "タイトルを入力してください" });
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
          toast({ body: "レシピを追加しました" });
          onClose();
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

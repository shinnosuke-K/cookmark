"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { VStack } from "@astryxdesign/core/VStack";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
  const toast = useToast();
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

  // recipeが読み込まれた/切り替わった、またはフォーム未編集のまま新しいデータが
  // 届いたタイミングで編集フォームの初期値をセットする。
  // useEffectではなく、レンダー中に変化を検知して直接setStateする
  // (CookedSheetのprevOpenと同じ「propの変化に応じてstateを調整する」パターン)。
  const [dirty, setDirty] = useState(false);
  const [seeded, setSeeded] = useState<{
    id: string;
    title: string;
    memo: string;
    category: RecipeCategory | null;
  } | null>(null);
  const needsReseed =
    recipe &&
    (!seeded ||
      recipe.id !== seeded.id ||
      (!dirty &&
        (recipe.title !== seeded.title ||
          (recipe.memo ?? "") !== seeded.memo ||
          recipe.category !== seeded.category)));
  if (needsReseed && recipe) {
    setSeeded({
      id: recipe.id,
      title: recipe.title,
      memo: recipe.memo ?? "",
      category: recipe.category,
    });
    setTitle(recipe.title);
    setMemo(recipe.memo ?? "");
    setCategory(recipe.category);
    setPhotoFile(null);
    setPhotoPreview(null);
    setDirty(false);
  }

  function handlePhotoChange(files: File | File[] | null) {
    const file = Array.isArray(files) ? (files[0] ?? null) : files;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
    setDirty(true);
  }

  async function handleSave() {
    if (!recipe) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({ type: "error", body: "タイトルを入力してください" });
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
        toast({ type: "error", body: "写真のアップロードに失敗しました" });
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
        onSuccess: () => {
          setDirty(false);
          toast({ body: "保存しました" });
        },
        onError: () =>
          toast({ type: "error", body: "保存に失敗しました。もう一度お試しください" }),
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
          toast({ body: "削除しました" });
          router.push("/");
        },
        onError: () =>
          toast({ type: "error", body: "削除に失敗しました。もう一度お試しください" }),
      },
    );
  }

  if (isLoading) {
    return (
      <Text type="body" color="secondary" className="flex flex-1 items-center justify-center p-8">
        読み込み中...
      </Text>
    );
  }

  if (!recipe) {
    return (
      <VStack gap={3} hAlign="center" justify="center" className="flex-1 p-8 text-center">
        <Text type="body" color="secondary">
          レシピが見つかりません
        </Text>
        <Link href="/">ホームへ戻る</Link>
      </VStack>
    );
  }

  const statusLabel =
    recipe.status === "cooked"
      ? recipe.verdict
        ? VERDICT_LABEL[recipe.verdict]
        : "作った(未評価)"
      : "未挑戦";

  return (
    <VStack gap={6} className="flex-1 p-4 pb-10">
      <Link href="/" size="sm" color="secondary">
        ← ホームへ戻る
      </Link>

      <HStack gap={3} align="start">
        <RecipeThumbnail photoPath={recipe.photo_path} />
        <VStack gap={1} hAlign="start" className="min-w-0 flex-1">
          <Heading level={1} maxLines={1}>
            {recipe.title}
          </Heading>
          {recipe.author_handle && (
            <Text type="supporting" color="secondary" maxLines={1}>
              @{recipe.author_handle}
            </Text>
          )}
          <Token label={statusLabel} color={recipe.verdict === "repeat" ? "orange" : "gray"} />
        </VStack>
      </HStack>

      {recipe.instagram_url && (
        <Link href={recipe.instagram_url} isExternalLink>
          Instagramで開く
        </Link>
      )}

      {recipe.post_shortcode && <InstagramEmbed shortcode={recipe.post_shortcode} />}

      <Card>
        <VStack gap={4}>
          <Heading level={2}>編集</Heading>

          <TextInput label="タイトル" value={title} onChange={(v) => { setTitle(v); setDirty(true); }} />

          <VStack gap={2}>
            <Text type="label">カテゴリ</Text>
            <ToggleButtonGroup
              label="カテゴリ"
              value={category}
              onChange={(value) => {
                setCategory(value as RecipeCategory | null);
                setDirty(true);
              }}
            >
              {CATEGORIES.map((c) => (
                <ToggleButton key={c} value={c} label={c} />
              ))}
            </ToggleButtonGroup>
          </VStack>

          <TextArea
            label="メモ"
            value={memo}
            onChange={(v) => { setMemo(v); setDirty(true); }}
            rows={3}
            placeholder="味付けのメモなど"
          />

          <VStack gap={2}>
            <FileInput
              label="写真"
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

          <Button
            label={updateRecipe.isPending || uploading ? "保存中..." : "保存する"}
            variant="primary"
            size="lg"
            width="100%"
            className="min-h-11"
            isDisabled={updateRecipe.isPending || uploading}
            onClick={handleSave}
          />
        </VStack>
      </Card>

      <Button
        label="削除する"
        variant="destructive"
        size="lg"
        width="100%"
        className="min-h-11"
        isDisabled={deleteRecipe.isPending}
        onClick={handleDelete}
      />
    </VStack>
  );
}

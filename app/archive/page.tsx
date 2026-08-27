"use client";

import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { VStack } from "@astryxdesign/core/VStack";
import { useMemo, useState } from "react";
import { ArchiveRecipeCard } from "@/components/ArchiveRecipeCard";
import { useMyMember } from "@/lib/board";
import type { RecipeCategory } from "@/lib/database.types";
import { useArchiveRecipes, useBoardMembers } from "@/lib/recipes";

const CATEGORIES: RecipeCategory[] = ["主菜", "副菜", "汁物", "麺・丼", "おやつ"];

export default function ArchivePage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: recipes, isLoading: recipesLoading } = useArchiveRecipes(
    member?.board_id,
  );
  const { data: members } = useBoardMembers(member?.board_id);

  const [repeatOnly, setRepeatOnly] = useState(false);
  const [category, setCategory] = useState<RecipeCategory | null>(null);
  const [keyword, setKeyword] = useState("");

  const memberNames = new Map((members ?? []).map((m) => [m.id, m.display_name]));

  const filtered = useMemo(() => {
    if (!recipes) return [];
    const kw = keyword.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (repeatOnly && recipe.verdict !== "repeat") return false;
      if (category && recipe.category !== category) return false;
      if (kw) {
        const haystack = `${recipe.title} ${recipe.memo ?? ""}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [recipes, repeatOnly, category, keyword]);

  if (memberLoading) {
    return (
      <Text type="body" color="secondary" className="flex flex-1 items-center justify-center p-8">
        読み込み中...
      </Text>
    );
  }

  if (!member) {
    return (
      <Text type="body" color="secondary" className="flex flex-1 items-center justify-center p-8 text-center">
        まだボードに参加していません
      </Text>
    );
  }

  return (
    <VStack gap={4} className="flex-1 p-4">
      <Heading level={1}>アーカイブ</Heading>

      <Switch
        label="リピート確定のみ表示"
        value={repeatOnly}
        onChange={setRepeatOnly}
        labelSpacing="spread"
        className="min-h-11"
      />

      <TextInput
        label="タイトル・メモで検索"
        isLabelHidden
        value={keyword}
        onChange={setKeyword}
        placeholder="タイトル・メモで検索"
        hasClear
      />

      <ToggleButtonGroup
        label="カテゴリで絞り込み"
        value={category}
        onChange={(value) => setCategory(value as RecipeCategory | null)}
      >
        {CATEGORIES.map((c) => (
          <ToggleButton key={c} value={c} label={c} />
        ))}
      </ToggleButtonGroup>

      {recipesLoading ? (
        <Text type="body" color="secondary" className="p-8 text-center">
          読み込み中...
        </Text>
      ) : filtered.length > 0 ? (
        <VStack as="ul" gap={3}>
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <ArchiveRecipeCard
                recipe={recipe}
                adderName={memberNames.get(recipe.added_by)}
              />
            </li>
          ))}
        </VStack>
      ) : (
        <EmptyState
          title={
            recipes && recipes.length > 0
              ? "条件に合うレシピがありません"
              : "作ったレシピはまだありません"
          }
        />
      )}
    </VStack>
  );
}

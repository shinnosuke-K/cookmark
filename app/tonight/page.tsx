"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { useMemo, useState } from "react";
import { RecipeThumbnail } from "@/components/RecipeThumbnail";
import { useMyMember } from "@/lib/board";
import { useArchiveRecipes, useTodoRecipes, type Recipe } from "@/lib/recipes";

type Source = "todo" | "repeat";

/** listからランダムに1件選ぶ。excludeIdがあれば(listが2件以上の場合)それを避ける。 */
function pickRandom(list: Recipe[], excludeId?: string): Recipe | null {
  if (list.length === 0) return null;
  if (list.length === 1 || !excludeId) {
    return list[Math.floor(Math.random() * list.length)];
  }
  const pool = list.filter((r) => r.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function TonightPage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: todoRecipes, isLoading: todoLoading } = useTodoRecipes(
    member?.board_id,
  );
  const { data: archiveRecipes, isLoading: archiveLoading } = useArchiveRecipes(
    member?.board_id,
  );

  const [source, setSource] = useState<Source>("todo");
  const [pick, setPick] = useState<Recipe | null>(null);

  const repeatRecipes = useMemo(
    () => (archiveRecipes ?? []).filter((r) => r.verdict === "repeat"),
    [archiveRecipes],
  );

  const pool = source === "todo" ? (todoRecipes ?? []) : repeatRecipes;
  const poolLoading = source === "todo" ? todoLoading : archiveLoading;

  // 表示元(source)の切り替えやデータ読み込み完了でpoolの中身が変わったら選び直す。
  // useEffectではなく、レンダー中にpoolの内容を前回と比較して直接setStateする
  // (CookedSheetのprevOpenと同じ「propの変化に応じてstateを調整する」パターン)。
  const poolKey = pool.map((r) => r.id).join(",");
  const [prevPoolKey, setPrevPoolKey] = useState(poolKey);
  if (poolKey !== prevPoolKey) {
    setPrevPoolKey(poolKey);
    setPick(pickRandom(pool));
  }

  function handleReroll() {
    setPick((current) => pickRandom(pool, current?.id));
  }

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
      <Heading level={1}>今夜どうする</Heading>

      <SegmentedControl
        label="提案元"
        value={source}
        onChange={(value) => setSource(value as Source)}
        layout="fill"
      >
        <SegmentedControlItem value="todo" label="未挑戦から" />
        <SegmentedControlItem value="repeat" label="リピート確定から" />
      </SegmentedControl>

      {poolLoading ? (
        <Text type="body" color="secondary" className="p-8 text-center">
          読み込み中...
        </Text>
      ) : pick ? (
        <Card>
          <VStack gap={4} hAlign="center">
            <RecipeThumbnail photoPath={pick.photo_path} />
            <VStack gap={1} hAlign="center">
              <Text type="large" weight="semibold">
                {pick.title}
              </Text>
              {pick.author_handle && (
                <Text type="supporting" color="secondary">
                  @{pick.author_handle}
                </Text>
              )}
              {pick.category && <Token label={pick.category} color="orange" />}
            </VStack>

            <HStack gap={3} className="w-full">
              <Button
                label="詳しく見る"
                variant="secondary"
                size="lg"
                href={`/recipe/${pick.id}`}
                className="min-h-11 flex-1"
              />
              <Button
                label="別のにする"
                variant="primary"
                size="lg"
                isDisabled={pool.length <= 1}
                onClick={handleReroll}
                className="min-h-11 flex-1"
              />
            </HStack>
          </VStack>
        </Card>
      ) : (
        <Text type="body" color="secondary" className="p-8 text-center">
          {source === "todo"
            ? "未挑戦のレシピがありません"
            : "リピート確定のレシピがまだありません"}
        </Text>
      )}
    </VStack>
  );
}

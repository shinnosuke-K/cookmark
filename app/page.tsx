"use client";

import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect, useState } from "react";
import { useCreateBoard, useMyMember } from "@/lib/board";
import { AddRecipeForm, type AddRecipeFormInitial } from "@/components/AddRecipeForm";
import { PasteBanner } from "@/components/PasteBanner";
import { RecipeCard } from "@/components/RecipeCard";
import { extractAuthorHandle, parseInstagramUrl } from "@/lib/instagram";
import { useBoardMembers, useTodoRecipes } from "@/lib/recipes";

const EMPTY_FORM: AddRecipeFormInitial = {
  url: "",
  title: "",
  authorHandle: "",
  category: null,
};

export default function Home() {
  const toast = useToast();
  const { data: member, isLoading } = useMyMember();
  const createBoard = useCreateBoard();
  const [name, setName] = useState("");

  const { data: recipes, isLoading: recipesLoading } = useTodoRecipes(
    member?.board_id,
  );
  const { data: members } = useBoardMembers(member?.board_id);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<AddRecipeFormInitial>(EMPTY_FORM);

  // Android share_target受け: ?url= / ?text= / ?title= があれば追加フォームを
  // 開いて流し込み、URLバーからクエリを消す。マウント時に一度だけ実行する。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url");
    const sharedText = params.get("text");
    const sharedTitle = params.get("title");
    if (!sharedUrl && !sharedText && !sharedTitle) return;

    const combined = [sharedUrl, sharedText].filter(Boolean).join(" ");
    const parsed = parseInstagramUrl(combined);
    // window.location はSSR/静的生成時に存在しないため、useStateの初期化子では
    // なくここ(マウント後のみ実行される)で一度だけ読み、フォームへ反映する。
    /* eslint-disable react-hooks/set-state-in-effect --
       ブラウザのクエリ文字列という外部システムからの一度きりの読み込みであり、
       useEffectの正当な用途(サーバー出力とズレないよう、マウント後にのみ
       状態を同期する)にあたるため許容する。 */
    setFormInitial({
      url: parsed?.cleanUrl ?? sharedUrl ?? "",
      title: sharedTitle ?? "",
      authorHandle: extractAuthorHandle(combined) ?? "",
      category: null,
    });
    setFormOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  function handleCreateBoard(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ type: "error", body: "名前を入力してください" });
      return;
    }
    createBoard.mutate(trimmed, {
      onSuccess: () => {
        toast({ body: "ボードを作成しました!" });
      },
      onError: () => {
        toast({ type: "error", body: "ボードの作成に失敗しました。もう一度お試しください" });
      },
    });
  }

  if (isLoading) {
    return (
      <Text type="body" color="secondary" className="flex flex-1 items-center justify-center p-8">
        読み込み中...
      </Text>
    );
  }

  if (!member) {
    return (
      <VStack gap={8} hAlign="center" justify="center" className="flex-1 p-6 text-center">
        <VStack gap={2}>
          <Heading level={1}>Cookmarkへようこそ</Heading>
          <Text type="body" color="secondary">
            夫婦でInstagramのレシピを共有・管理するアプリです
          </Text>
        </VStack>

        <VStack
          as="form"
          onSubmit={handleCreateBoard}
          gap={4}
          className="w-full max-w-xs text-left"
        >
          <TextInput
            label="あなたの名前"
            value={name}
            onChange={setName}
            placeholder="例: 夫、妻"
          />
          <Button
            type="submit"
            label={createBoard.isPending ? "作成中..." : "新しくボードを作る"}
            variant="primary"
            size="lg"
            width="100%"
            className="min-h-11"
            isDisabled={createBoard.isPending}
          />
        </VStack>

        <Text type="supporting" color="secondary" className="max-w-xs">
          パートナーがすでにボードを作っている場合は、届いた招待URLを開いて参加してください
        </Text>
      </VStack>
    );
  }

  const memberNames = new Map((members ?? []).map((m) => [m.id, m.display_name]));

  return (
    <VStack gap={4} className="flex-1 p-4">
      <PasteBanner
        onOpen={(initial) => {
          setFormInitial(initial);
          setFormOpen(true);
        }}
      />

      {recipesLoading ? (
        <Text type="body" color="secondary" className="p-8 text-center">
          読み込み中...
        </Text>
      ) : recipes && recipes.length > 0 ? (
        <VStack as="ul" gap={3}>
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                adderName={memberNames.get(recipe.added_by)}
              />
            </li>
          ))}
        </VStack>
      ) : (
        <EmptyState
          title="レシピはまだありません"
          description="上のボタンから追加しましょう"
        />
      )}

      {formOpen && (
        <AddRecipeForm
          boardId={member.board_id}
          memberId={member.id}
          initial={formInitial}
          onClose={() => setFormOpen(false)}
        />
      )}
    </VStack>
  );
}

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
      toast.error("名前を入力してください");
      return;
    }
    createBoard.mutate(trimmed, {
      onSuccess: () => {
        toast.success("ボードを作成しました!");
      },
      onError: () => {
        toast.error("ボードの作成に失敗しました。もう一度お試しください");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        読み込み中...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Cookmarkへようこそ</h1>
          <p className="mt-2 text-sm text-zinc-500">
            夫婦でInstagramのレシピを共有・管理するアプリです
          </p>
        </div>

        <form
          onSubmit={handleCreateBoard}
          className="w-full max-w-xs space-y-4 text-left"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-700"
            >
              あなたの名前
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 夫、妻"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-3 text-base"
            />
          </div>
          <button
            type="submit"
            disabled={createBoard.isPending}
            className="min-h-[44px] w-full rounded-lg bg-orange-500 py-3 text-base font-semibold text-white disabled:opacity-50"
          >
            {createBoard.isPending ? "作成中..." : "新しくボードを作る"}
          </button>
        </form>

        <p className="max-w-xs text-sm text-zinc-400">
          パートナーがすでにボードを作っている場合は、届いた招待URLを開いて参加してください
        </p>
      </div>
    );
  }

  const memberNames = new Map((members ?? []).map((m) => [m.id, m.display_name]));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <PasteBanner
        onOpen={(initial) => {
          setFormInitial(initial);
          setFormOpen(true);
        }}
      />

      {recipesLoading ? (
        <p className="p-8 text-center text-sm text-zinc-500">読み込み中...</p>
      ) : recipes && recipes.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                adderName={memberNames.get(recipe.added_by)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-8 text-center text-sm text-zinc-500">
          レシピはまだありません。上のボタンから追加しましょう
        </p>
      )}

      {formOpen && (
        <AddRecipeForm
          boardId={member.board_id}
          memberId={member.id}
          initial={formInitial}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

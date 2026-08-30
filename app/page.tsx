"use client";

import { ForkKnife } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { useEffect, useState } from "react";
import { AddRecipeForm, type AddRecipeFormInitial } from "@/components/AddRecipeForm";
import { PasteBanner } from "@/components/PasteBanner";
import { RecipeCard } from "@/components/RecipeCard";
import { useToast } from "@/components/Toast";
import { useCreateBoard, useMyMember } from "@/lib/board";
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
      toast("名前を入力してください");
      return;
    }
    createBoard.mutate(trimmed, {
      onSuccess: () => toast("ボードを作成しました!"),
      onError: () => toast("ボードの作成に失敗しました。もう一度お試しください"),
    });
  }

  if (isLoading) {
    return (
      <div className="ck-screen ck-meta items-center justify-center">
        読み込み中...
      </div>
    );
  }

  // まだどのボードにも参加していないとき。招待参加(4e)と同じ体裁で
  // 「新しくボードを作る」導線を出す。
  if (!member) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-[34px] text-center">
        <ForkKnife size={44} weight="duotone" color="var(--color-accent)" />
        <h1 className="mt-[18px] mb-2 text-[24px] leading-[1.25] font-semibold tracking-[-0.015em]">
          Cookmarkへようこそ
        </h1>
        <p className="mb-8 text-[15px] text-[rgba(32,30,29,.6)]">
          夫婦でInstagramのレシピを共有・管理するアプリです
        </p>

        <form onSubmit={handleCreateBoard} className="w-full text-left">
          <label className="ck-label" htmlFor="board-name">
            あなたの名前
          </label>
          <input
            id="board-name"
            className="ck-input min-h-12 text-[16px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 夫、妻"
          />
          <button
            type="submit"
            disabled={createBoard.isPending}
            className="ck-btn ck-btn-primary mt-[18px] min-h-14 w-full text-[17px]"
          >
            {createBoard.isPending ? "作成中..." : "新しくボードを作る"}
          </button>
        </form>

        <p className="mt-7 text-[14px] leading-[1.6] text-[rgba(32,30,29,.6)]">
          パートナーがすでにボードを作っている場合は、届いた招待URLを開いて参加してください
        </p>
      </div>
    );
  }

  const memberNames = new Map((members ?? []).map((m) => [m.id, m.display_name]));

  return (
    <>
      <div className="ck-screen">
        <h1 className="ck-title mb-6">Cookmark</h1>

        {recipesLoading ? (
          <p className="ck-meta py-8 text-center">読み込み中...</p>
        ) : recipes && recipes.length > 0 ? (
          <ul
            className="flex flex-col gap-[26px]"
            style={{ paddingBottom: "calc(var(--tabbar-h) + 104px)" }}
          >
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
          <div
            className="flex flex-1 flex-col items-center justify-center gap-1.5 text-[rgba(32,30,29,.55)]"
            style={{ paddingBottom: "calc(var(--tabbar-h) + 34px)" }}
          >
            <ForkKnife size={36} weight="duotone" />
            <p className="text-[17px] font-semibold text-text">
              レシピはまだありません
            </p>
            <p className="text-[14px]">下のボタンから追加しましょう</p>
          </div>
        )}
      </div>

      <PasteBanner
        onOpen={(initial) => {
          setFormInitial(initial);
          setFormOpen(true);
        }}
      />

      {formOpen && (
        <AddRecipeForm
          boardId={member.board_id}
          memberId={member.id}
          initial={formInitial}
          onClose={() => setFormOpen(false)}
        />
      )}
    </>
  );
}

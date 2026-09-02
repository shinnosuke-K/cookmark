"use client";

import { At } from "@phosphor-icons/react/dist/csr/At";
import { ForkKnife } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { UsersThree } from "@phosphor-icons/react/dist/csr/UsersThree";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddRecipeForm, type AddRecipeFormInitial } from "@/components/AddRecipeForm";
import { CategoryChips } from "@/components/CategoryChips";
import { PasteBanner } from "@/components/PasteBanner";
import { RecipeCard } from "@/components/RecipeCard";
import { useToast } from "@/components/Toast";
import { useCreateBoard, useMyMember } from "@/lib/board";
import type { RecipeCategory } from "@/lib/database.types";
import { extractAuthorHandle, parseInstagramUrl } from "@/lib/instagram";
import { useBoardMembers, useTodoRecipes, type Recipe } from "@/lib/recipes";

/** ホームのグループ表示。null=グループなし。 */
type GroupBy = "handle" | "adder";

/** グループ表示トグルの見た目。選択中はシアンのインセットリング付きの淡色地。 */
function groupPillStyle(selected: boolean) {
  return selected
    ? {
        background: "var(--color-accent-100)",
        color: "var(--color-accent-700)",
        boxShadow: "inset 0 0 0 2px var(--color-accent)",
      }
    : {
        background: "var(--color-neutral-200)",
        color: "var(--color-text)",
      };
}

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

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<RecipeCategory | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<AddRecipeFormInitial>(EMPTY_FORM);
  // 直前に追加確定した投稿のshortcode。クリップボードに同じURLが残ったまま
  // 「貼り付けて追加」を連打すると、そのままでは今しがた追加した内容が再び
  // 流し込まれて「入力が残っている」ように見えてしまうため、一致する間は
  // 空のフォームを開く(手動入力にフォールバックする)。
  const lastAddedShortcodeRef = useRef<string | null>(null);

  const memberNames = useMemo(
    () => new Map((members ?? []).map((m) => [m.id, m.display_name])),
    [members],
  );

  // 検索語・カテゴリはAND条件。検索はタイトル・食材・メモを横断する。
  const filtered = useMemo(() => {
    if (!recipes) return [];
    const kw = keyword.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (category && recipe.category !== category) return false;
      if (kw) {
        const haystack =
          `${recipe.title} ${recipe.ingredients ?? ""} ${recipe.memo ?? ""}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [recipes, category, keyword]);

  // グループ表示。件数の多い順に並べ、グループ内は元の並び(新着順)を保つ。
  // 投稿者ごとの場合、handle未設定のレシピは追加者名でまとめる。
  const groups = useMemo(() => {
    if (!groupBy) return null;
    const byKey = new Map<string, Recipe[]>();
    for (const recipe of filtered) {
      const adder = memberNames.get(recipe.added_by);
      const key =
        groupBy === "adder"
          ? (adder ?? "追加者不明")
          : recipe.author_handle
            ? `@${recipe.author_handle}`
            : `${adder ?? "追加者不明"}が追加`;
      const bucket = byKey.get(key);
      if (bucket) bucket.push(recipe);
      else byKey.set(key, [recipe]);
    }
    return [...byKey.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, groupBy, memberNames]);

  function handleOpenForm(initial: AddRecipeFormInitial) {
    const parsed = parseInstagramUrl(initial.url);
    if (parsed && parsed.shortcode === lastAddedShortcodeRef.current) {
      setFormInitial(EMPTY_FORM);
    } else {
      setFormInitial(initial);
    }
    setFormOpen(true);
  }

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

  const listPadding = { paddingBottom: "calc(var(--tabbar-h) + 104px)" };
  const noRecipesAtAll = !recipes || recipes.length === 0;

  return (
    <>
      <div className="ck-screen">
        <h1 className="ck-title mb-3.5">Cookmark</h1>

        <div className="relative mb-3">
          <MagnifyingGlass
            size={18}
            weight="duotone"
            color="#7d7979"
            className="absolute top-1/2 left-2.5 -translate-y-1/2"
          />
          <input
            className="ck-input min-h-11 pl-[34px]"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="タイトル・食材・メモで検索"
            aria-label="タイトル・食材・メモで検索"
            type="search"
          />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <CategoryChips
            label="カテゴリで絞り込み"
            value={category}
            onChange={setCategory}
          />
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              aria-pressed={groupBy === "handle"}
              onClick={() =>
                setGroupBy((prev) => (prev === "handle" ? null : "handle"))
              }
              className="ck-tag ck-pill ck-chip px-3.5 py-1.5"
              style={groupPillStyle(groupBy === "handle")}
            >
              <At size={16} weight="duotone" />
              投稿者ごと
            </button>
            <button
              type="button"
              aria-pressed={groupBy === "adder"}
              onClick={() =>
                setGroupBy((prev) => (prev === "adder" ? null : "adder"))
              }
              className="ck-tag ck-pill ck-chip px-3.5 py-1.5"
              style={groupPillStyle(groupBy === "adder")}
            >
              <UsersThree size={16} weight="duotone" />
              追加した人ごと
            </button>
          </div>
        </div>

        {recipesLoading ? (
          <p className="ck-meta py-8 text-center">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-1.5 text-[rgba(32,30,29,.55)]"
            style={{ paddingBottom: "calc(var(--tabbar-h) + 34px)" }}
          >
            <ForkKnife size={36} weight="duotone" />
            <p className="text-[17px] font-semibold text-text">
              {noRecipesAtAll
                ? "レシピはまだありません"
                : "一致するレシピはありません"}
            </p>
            <p className="text-[14px]">
              {noRecipesAtAll
                ? "下のボタンから追加しましょう"
                : "検索語やタグを見直してみてください"}
            </p>
          </div>
        ) : groups ? (
          <div className="flex flex-col gap-[26px]" style={listPadding}>
            {groups.map(([groupName, items]) => (
              <section key={groupName} className="flex flex-col gap-[18px]">
                {/* 新聞の見出し罫。Broadsheetで罫線を引くのはここだけ */}
                <div className="flex items-baseline gap-2.5 border-b-2 border-text pb-1.5">
                  <h2 className="text-[16px] font-semibold">{groupName}</h2>
                  <span className="text-[14px] text-[rgba(32,30,29,.5)]">
                    {items.length}件
                  </span>
                </div>
                <ul className="flex flex-col gap-[26px]">
                  {items.map((recipe) => (
                    <li key={recipe.id}>
                      <RecipeCard
                        recipe={recipe}
                        adderName={memberNames.get(recipe.added_by)}
                        hideSubtitle
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="flex flex-col gap-[26px]" style={listPadding}>
            {filtered.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard
                  recipe={recipe}
                  adderName={memberNames.get(recipe.added_by)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <PasteBanner onOpen={handleOpenForm} />

      {formOpen && (
        <AddRecipeForm
          boardId={member.board_id}
          memberId={member.id}
          initial={formInitial}
          onClose={() => setFormOpen(false)}
          onAdded={(shortcode) => {
            lastAddedShortcodeRef.current = shortcode;
          }}
        />
      )}
    </>
  );
}

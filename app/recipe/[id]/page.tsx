"use client";

import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { CaretLeft } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { InstagramLogo } from "@phosphor-icons/react/dist/csr/InstagramLogo";
import { ThumbsDown } from "@phosphor-icons/react/dist/csr/ThumbsDown";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryChips } from "@/components/CategoryChips";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InstagramEmbed } from "@/components/InstagramEmbed";
import { StatusBadge } from "@/components/VerdictBadge";
import { useToast } from "@/components/Toast";
import { useBoardMembers } from "@/lib/recipes";
import { useMyMember } from "@/lib/board";
import type { RecipeCategory, RecipeVerdict } from "@/lib/database.types";
import {
  useCookAgain,
  useDeleteRecipe,
  useRecipe,
  useUpdateRecipe,
} from "@/lib/recipes";

export default function RecipeDetailPage() {
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipe(params.id);
  const { data: member } = useMyMember();
  const { data: members } = useBoardMembers(member?.board_id);
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const cookAgain = useCookAgain();

  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [category, setCategory] = useState<RecipeCategory | null>(null);
  const [verdict, setVerdict] = useState<RecipeVerdict | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // recipeが読み込まれた/切り替わった、またはフォーム未編集のまま新しいデータが
  // 届いたタイミングで編集フォームの初期値をセットする。
  // useEffectではなく、レンダー中に変化を検知して直接setStateする。
  const [dirty, setDirty] = useState(false);
  const [seeded, setSeeded] = useState<{
    id: string;
    title: string;
    memo: string;
    category: RecipeCategory | null;
    verdict: RecipeVerdict | null;
  } | null>(null);
  const needsReseed =
    recipe &&
    (!seeded ||
      recipe.id !== seeded.id ||
      (!dirty &&
        (recipe.title !== seeded.title ||
          (recipe.memo ?? "") !== seeded.memo ||
          recipe.category !== seeded.category ||
          recipe.verdict !== seeded.verdict)));
  if (needsReseed && recipe) {
    setSeeded({
      id: recipe.id,
      title: recipe.title,
      memo: recipe.memo ?? "",
      category: recipe.category,
      verdict: recipe.verdict,
    });
    setTitle(recipe.title);
    setMemo(recipe.memo ?? "");
    setCategory(recipe.category);
    setVerdict(recipe.verdict);
    setDirty(false);
  }

  function handleSave() {
    if (!recipe) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast("タイトルを入力してください");
      return;
    }

    updateRecipe.mutate(
      {
        id: recipe.id,
        boardId: recipe.board_id,
        title: trimmedTitle,
        memo: memo.trim() || null,
        category,
        ...(recipe.status === "cooked" ? { verdict } : {}),
      },
      {
        onSuccess: () => {
          setDirty(false);
          toast("保存しました");
        },
        onError: () => toast("保存に失敗しました。もう一度お試しください"),
      },
    );
  }

  function handleCookAgain() {
    if (!recipe) return;
    cookAgain.mutate(
      { id: recipe.id, boardId: recipe.board_id, currentCount: recipe.cook_count },
      {
        onSuccess: (updated) => toast(`${updated.cook_count}回目を記録しました`),
        onError: () => toast("記録に失敗しました。もう一度お試しください"),
      },
    );
  }

  function handleDelete() {
    if (!recipe) return;
    deleteRecipe.mutate(
      { id: recipe.id, boardId: recipe.board_id },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast("削除しました");
          router.push("/");
        },
        onError: () => {
          setConfirmOpen(false);
          toast("削除に失敗しました。もう一度お試しください");
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="ck-screen ck-meta items-center justify-center">
        読み込み中...
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="ck-screen items-center justify-center gap-3 text-center">
        <p className="ck-meta">レシピが見つかりません</p>
        <Link href="/" className="text-[15px] text-accent">
          ホームへ戻る
        </Link>
      </div>
    );
  }

  const adderName = members?.find((m) => m.id === recipe.added_by)?.display_name;
  const subtitle = [
    recipe.author_handle ? `@${recipe.author_handle}` : null,
    adderName ? `${adderName}が追加` : null,
  ]
    .filter(Boolean)
    .join(" ・ ");

  const busy = updateRecipe.isPending;

  return (
    <div className="ck-screen">
      <Link
        href="/"
        className="flex min-h-11 w-fit items-center gap-1 text-[14px] text-accent"
      >
        <CaretLeft size={16} weight="duotone" />
        ホームへ戻る
      </Link>

      <h1 className="text-[24px] leading-[1.2] font-semibold tracking-[-0.015em]">
        {recipe.title}
      </h1>

      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
        {subtitle && <span className="ck-meta">{subtitle}</span>}
        <StatusBadge status={recipe.status} verdict={recipe.verdict} />
        {recipe.status === "cooked" && (
          <>
            <span className="ck-meta text-[14px]">{recipe.cook_count}回作った</span>
            <button
              type="button"
              onClick={handleCookAgain}
              disabled={cookAgain.isPending}
              className="ck-btn ck-btn-primary ck-pill min-h-11 px-4 text-[14px]"
            >
              <ArrowsClockwise size={16} weight="duotone" />
              また作った!
            </button>
          </>
        )}
      </div>

      {/* 写真はリストのサムネイル専用。詳細画面ではembedのみ表示する。
          投稿がある場合は縦に十分な高さを取り、iframe内で投稿全体をスクロールできる */}
      <div className="mt-4">
        <div
          className={`relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-md bg-surface text-[#7d7979] ${
            recipe.post_shortcode ? "h-[60vh] max-h-[600px]" : "h-[130px]"
          }`}
        >
          <InstagramLogo size={28} weight="duotone" />
          <span className="font-mono text-[14px]">Instagram投稿</span>
          {recipe.post_shortcode && (
            <InstagramEmbed
              shortcode={recipe.post_shortcode}
              className="absolute inset-0"
            />
          )}
        </div>
      </div>

      {recipe.instagram_url && (
        <a
          href={recipe.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 w-fit items-center gap-1.5 text-[15px] text-accent"
        >
          <ArrowSquareOut size={18} weight="duotone" />
          Instagramで開く
        </a>
      )}

      <div
        className="mt-3.5 flex flex-col gap-3"
        style={{ paddingBottom: "calc(var(--tabbar-h) + 24px)" }}
      >
        <div>
          <label className="ck-label" htmlFor="detail-title">
            タイトル
          </label>
          <input
            id="detail-title"
            className="ck-input min-h-11"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
          />
        </div>

        <div>
          <span className="ck-label">カテゴリ</span>
          <CategoryChips
            label="カテゴリ"
            value={category}
            onChange={(next) => {
              setCategory(next);
              setDirty(true);
            }}
          />
        </div>

        {recipe.status === "cooked" && (
          <div>
            <span className="ck-label">評価</span>
            <div className="flex gap-2" role="group" aria-label="評価">
              <button
                type="button"
                aria-pressed={verdict === "repeat"}
                onClick={() => {
                  setVerdict((prev) => (prev === "repeat" ? null : "repeat"));
                  setDirty(true);
                }}
                className="ck-tag ck-chip px-3.5 py-1.5"
                style={
                  verdict === "repeat"
                    ? {
                        background: "var(--color-accent-2-600)",
                        color: "#fff",
                        fontWeight: 600,
                      }
                    : {
                        background: "var(--color-accent-2-100)",
                        color: "var(--color-accent-2-700)",
                        opacity: 0.75,
                      }
                }
              >
                <ArrowsClockwise size={15} weight="duotone" />
                リピート確定
              </button>
              <button
                type="button"
                aria-pressed={verdict === "meh"}
                onClick={() => {
                  setVerdict((prev) => (prev === "meh" ? null : "meh"));
                  setDirty(true);
                }}
                className="ck-tag ck-chip px-3.5 py-1.5"
                style={
                  verdict === "meh"
                    ? {
                        background: "var(--color-neutral-300)",
                        color: "var(--color-neutral-800)",
                      }
                    : {
                        border: "1.5px dashed var(--color-neutral-500)",
                        background: "transparent",
                        color: "var(--color-neutral-700)",
                      }
                }
              >
                <ThumbsDown size={15} weight="duotone" />
                イマイチ
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="ck-label" htmlFor="detail-memo">
            メモ
          </label>
          <textarea
            id="detail-memo"
            className="ck-input min-h-14"
            value={memo}
            onChange={(e) => {
              setMemo(e.target.value);
              setDirty(true);
            }}
            placeholder="味付けのメモなど"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="ck-btn ck-btn-primary min-h-[52px] w-full text-[16px]"
        >
          {busy ? "保存中..." : "保存する"}
        </button>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={deleteRecipe.isPending}
          className="ck-btn ck-btn-ghost min-h-11 w-full text-[15px]"
          style={{ color: "var(--color-accent-2-700)" }}
        >
          <Trash size={18} weight="duotone" />
          削除する
        </button>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="このレシピを削除しますか?"
          body="元に戻せません"
          confirmLabel="削除する"
          isPending={deleteRecipe.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}

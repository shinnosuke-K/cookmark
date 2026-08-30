"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryChips } from "./CategoryChips";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { fetchOgData, parseInstagramUrl, type OgData } from "@/lib/instagram";
import { uploadRecipePhoto } from "@/lib/photos";
import { useAddRecipe, useUpdateRecipe, type Recipe } from "@/lib/recipes";
import type { RecipeCategory } from "@/lib/database.types";

const OG_CAPTION_MAX_LENGTH = 2000;

/**
 * Unicodeのコードポイント単位で文字列を切り詰める。`string.slice()` はUTF-16
 * コード単位で切るため、絵文字などのサロゲートペアの境界で分断してしまうことがあり、
 * その半端な文字列はPostgRESTにJSONとして拒否され、レシピ登録ごと失敗してしまう。
 */
function truncateToCodePoints(text: string, maxLength: number): string {
  const chars = Array.from(text);
  return chars.length > maxLength ? chars.slice(0, maxLength).join("") : text;
}

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
  /** 追加確定時に呼ばれる(URLがInstagram投稿として解析できていればそのshortcode、
   *  できていなければnull)。呼び出し元が「直前に追加したのと同じ投稿の再流し込みを
   *  防ぐ」用途に使う。 */
  onAdded?: (shortcode: string | null) => void;
}

/**
 * 貼り付けピル・共有シート受け(share_target)の両方から開かれる追加ボトムシート。
 * InstagramのURLが解析できてもできなくても、タイトルさえ入れれば追加できる。
 */
export function AddRecipeForm({
  boardId,
  memberId,
  initial,
  onClose,
  onAdded,
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
  // 直近に取得済み(または取得中)のshortcode。同じshortcodeへの再取得や、
  // 後から来た古いリクエストのレスポンスで新しい入力を上書きしてしまうのを防ぐ。
  const lastFetchedShortcodeRef = useRef<string | null>(null);
  // タイトル・投稿者ハンドルについて「直近に自動入力した値」。ユーザーがこの値から
  // 手で書き換えていない(=フィールドの現在値がこの値と一致している)間だけ、次の
  // 自動取得結果で上書きしてよいと判断する。手で編集した時点でユーザー所有になり、
  // 以降どのfetchが完了しても上書きしない。
  const autoFilledTitleRef = useRef<string | null>(null);
  const autoFilledAuthorHandleRef = useRef<string | null>(null);

  const applyOgData = useCallback((data: OgData) => {
    ogDataRef.current = data;
    setTitle((prev) => {
      const ownedByUser = prev.trim() !== "" && prev !== autoFilledTitleRef.current;
      if (ownedByUser) return prev;
      autoFilledTitleRef.current = data.title;
      return data.title;
    });
    const handle = data.authorHandle;
    if (handle) {
      setAuthorHandle((prev) => {
        const ownedByUser =
          prev.trim() !== "" && prev !== autoFilledAuthorHandleRef.current;
        if (ownedByUser) return prev;
        autoFilledAuthorHandleRef.current = handle;
        return handle;
      });
    }
  }, []);

  useEffect(() => {
    const parsed = parseInstagramUrl(initial.url);
    if (!parsed) return;
    lastFetchedShortcodeRef.current = parsed.shortcode;

    let cancelled = false;
    fetchOgData(parsed.shortcode).then((data) => {
      if (cancelled || !data) return;
      applyOgData(data);
    });

    return () => {
      cancelled = true;
    };
  }, [initial.url, applyOgData]);

  // 手動入力・貼り付けによるURL欄の変更を検知した自動取得。連打のたびに叩かない
  // よう600msデバウンスし、直近に扱ったshortcodeと同じ間は何もしない。デバウンス後
  // 実際にfetchを開始する直前にlastFetchedShortcodeRefを更新しておくことで、後から
  // 別のURLに変わった場合に古いレスポンスが新しい入力を上書きしないようにする。
  useEffect(() => {
    const parsed = parseInstagramUrl(url);
    const shortcode = parsed?.shortcode ?? null;

    // URLが変わってshortcodeが変化した(または解析できなくなった)場合、古い
    // shortcode向けに取得したOGデータ(キャプション・画像URL)を追加確定時に
    // 使い回してしまわないよう、ここで即座に破棄する。
    if (shortcode !== lastFetchedShortcodeRef.current) {
      lastFetchedShortcodeRef.current = null;
      ogDataRef.current = null;
    }

    if (!parsed || shortcode === lastFetchedShortcodeRef.current) return;
    const targetShortcode = parsed.shortcode;

    let cancelled = false;
    const timer = setTimeout(() => {
      lastFetchedShortcodeRef.current = targetShortcode;
      fetchOgData(targetShortcode).then((data) => {
        if (cancelled || !data || lastFetchedShortcodeRef.current !== targetShortcode) return;
        applyOgData(data);
      });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url, applyOgData]);

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
      // photo_pathだけを更新する。title/memo/categoryを渡さないのは、アップロード
      // 待ちの間にユーザーが詳細画面で編集していた場合、その内容を巻き戻さないため。
      updateRecipe.mutate({
        id: recipe.id,
        boardId: recipe.board_id,
        photoPath,
      });
    } catch (err) {
      console.warn("Instagramの画像取得に失敗しました", err);
    }
  }

  function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast("タイトルを入力してください");
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
        memo: ogData?.caption
          ? truncateToCodePoints(ogData.caption, OG_CAPTION_MAX_LENGTH)
          : null,
      },
      {
        onSuccess: (recipe) => {
          toast("レシピを追加しました");
          onClose();
          onAdded?.(parsed?.shortcode ?? null);
          if (ogData?.imageUrl) {
            void attachOgPhoto(recipe, ogData.imageUrl);
          }
        },
        onError: () => toast("追加に失敗しました。もう一度お試しください"),
      },
    );
  }

  function handleEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <Sheet label="レシピを追加" onClose={onClose}>
      <p className="mb-[18px] text-[23px] font-semibold">レシピを追加</p>

      <div className="flex flex-col gap-3.5">
        <div>
          <label className="ck-label" htmlFor="add-url">
            InstagramのURL(任意)
          </label>
          <input
            id="add-url"
            className="ck-input min-h-11 font-mono text-[14px]"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleEnter}
            placeholder="https://www.instagram.com/p/..."
            inputMode="url"
          />
        </div>

        <div>
          <label className="ck-label" htmlFor="add-title">
            タイトル(必須)
          </label>
          <input
            id="add-title"
            className="ck-input min-h-11"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleEnter}
            placeholder="例: 鶏むね肉のねぎ塩レモン"
            autoFocus
          />
        </div>

        <div>
          <span className="ck-label">カテゴリ(任意)</span>
          <CategoryChips
            label="カテゴリ"
            value={category}
            onChange={setCategory}
          />
        </div>

        <div>
          <label className="ck-label" htmlFor="add-handle">
            投稿者ハンドル(任意)
          </label>
          <input
            id="add-handle"
            className="ck-input min-h-11"
            value={authorHandle}
            onChange={(e) => setAuthorHandle(e.target.value)}
            onKeyDown={handleEnter}
            placeholder="例: foodie_taro"
          />
        </div>

        <div className="mt-1.5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="ck-btn ck-btn-secondary min-h-[52px] flex-1 text-[16px]"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={addRecipe.isPending}
            className="ck-btn ck-btn-primary min-h-[52px] flex-2 text-[16px]"
          >
            {addRecipe.isPending ? "追加中..." : "追加する"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

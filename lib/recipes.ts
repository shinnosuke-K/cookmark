import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Member } from "./board";
import type { Database, RecipeCategory, RecipeVerdict } from "./database.types";

export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];

export const todoRecipesQueryKey = (boardId: string | undefined) =>
  ["recipes", "todo", boardId] as const;

export const archiveRecipesQueryKey = (boardId: string | undefined) =>
  ["recipes", "archive", boardId] as const;

export const boardMembersQueryKey = (boardId: string | undefined) =>
  ["boardMembers", boardId] as const;

export const recipeQueryKey = (id: string | undefined) =>
  ["recipe", id] as const;

/** ボードの全メンバー(追加者名の表示用)。 */
export async function getBoardMembers(boardId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("board_id", boardId);

  if (error) throw error;
  return data;
}

export function useBoardMembers(boardId: string | undefined) {
  return useQuery({
    queryKey: boardMembersQueryKey(boardId),
    queryFn: () => getBoardMembers(boardId as string),
    enabled: !!boardId,
  });
}

/** 未挑戦(status='todo')のレシピを新しい順で取得する。 */
export async function getTodoRecipes(boardId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("board_id", boardId)
    .eq("status", "todo")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export function useTodoRecipes(boardId: string | undefined) {
  return useQuery({
    queryKey: todoRecipesQueryKey(boardId),
    queryFn: () => getTodoRecipes(boardId as string),
    enabled: !!boardId,
  });
}

/** 作った(status='cooked')レシピを新しい順(cooked_at基準、無ければcreated_at)で取得する。 */
export async function getArchiveRecipes(boardId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("board_id", boardId)
    .eq("status", "cooked")
    .order("cooked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export function useArchiveRecipes(boardId: string | undefined) {
  return useQuery({
    queryKey: archiveRecipesQueryKey(boardId),
    queryFn: () => getArchiveRecipes(boardId as string),
    enabled: !!boardId,
  });
}

/** レシピ1件を取得する(詳細画面用)。見つからなければnull。 */
export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: recipeQueryKey(id),
    queryFn: () => getRecipe(id as string),
    enabled: !!id,
  });
}

export interface AddRecipeInput {
  boardId: string;
  addedBy: string;
  title: string;
  authorHandle: string | null;
  category: RecipeCategory | null;
  instagramUrl: string | null;
  postShortcode: string | null;
  /** Instagram自動取得(ベストエフォート)のキャプションを添えて登録する場合のみ指定する。 */
  memo?: string | null;
}

export async function addRecipe(input: AddRecipeInput): Promise<Recipe> {
  const { data, error } = await supabase
    .from("recipes")
    .insert({
      board_id: input.boardId,
      added_by: input.addedBy,
      title: input.title,
      author_handle: input.authorHandle,
      category: input.category,
      instagram_url: input.instagramUrl,
      post_shortcode: input.postShortcode,
      memo: input.memo ?? null,
      status: "todo",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function useAddRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addRecipe,
    onSuccess: (recipe) => {
      queryClient.invalidateQueries({
        queryKey: todoRecipesQueryKey(recipe.board_id),
      });
    },
  });
}

export interface MarkRecipeCookedInput {
  id: string;
  boardId: string;
  /** CookedSheetで2択のどちらかを選んだ場合はその値、選ばずに閉じた場合はnull */
  verdict: RecipeVerdict | null;
  memo?: string | null;
  photoPath?: string | null;
}

/**
 * 「作った!」を確定する。status='cooked' / verdict / cooked_at=now() を更新し、
 * 指定があれば memo / photo_path も併せて更新する。
 */
export async function markRecipeCooked({
  id,
  verdict,
  memo,
  photoPath,
}: MarkRecipeCookedInput): Promise<void> {
  const update: Database["public"]["Tables"]["recipes"]["Update"] = {
    status: "cooked",
    verdict,
    cooked_at: new Date().toISOString(),
    cook_count: 1,
  };
  if (memo !== undefined) update.memo = memo;
  if (photoPath !== undefined) update.photo_path = photoPath;

  const { error } = await supabase.from("recipes").update(update).eq("id", id);
  if (error) throw error;
}

export interface UseMarkRecipeCookedOptions {
  /**
   * 成功時の追加処理(トースト表示・画面遷移など)。
   * CookedSheetは選択と同時に即クローズする設計のため、ネットワーク往復が終わる前に
   * 呼び出し元コンポーネントがアンマウントされる。`mutate(vars, { onSuccess })` に
   * 直接渡したコールバックはTanStack Queryの仕様上、購読者(mounted観測者)が
   * いなくなると発火しなくなるため、ここ(フック生成時のオプション)に登録する
   * 必要がある。フック生成時のonSuccessはMutation側に保持され、アンマウント後も
   * 確実に呼ばれる。
   */
  onSuccess?: (variables: MarkRecipeCookedInput) => void;
  onError?: () => void;
}

export function useMarkRecipeCooked(options?: UseMarkRecipeCookedOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRecipeCooked,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: todoRecipesQueryKey(variables.boardId),
      });
      queryClient.invalidateQueries({
        queryKey: archiveRecipesQueryKey(variables.boardId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKey(variables.id),
      });
      options?.onSuccess?.(variables);
    },
    onError: () => {
      options?.onError?.();
    },
  });
}

export interface UpdateRecipeInput {
  id: string;
  boardId: string;
  /** 指定したフィールドのみ更新する。undefinedのフィールドは既存値を保持する
   *  (例: 自動取得した写真だけをphoto_pathに反映し、title/memo/categoryへの
   *  他編集を上書きしないようにする用途)。 */
  title?: string;
  memo?: string | null;
  category?: RecipeCategory | null;
  /** 写真を差し替えた場合のみ指定する。undefinedなら既存の写真を保持する。 */
  photoPath?: string;
  /** 作った後の評価の編集(cooked限定)。nullで未評価に戻す。undefinedなら変更しない。 */
  verdict?: RecipeVerdict | null;
}

/** 詳細画面での編集(タイトル・メモ・カテゴリ・評価・写真)、または部分更新を保存する。 */
export async function updateRecipe({
  id,
  title,
  memo,
  category,
  photoPath,
  verdict,
}: UpdateRecipeInput): Promise<Recipe> {
  const update: Database["public"]["Tables"]["recipes"]["Update"] = {};
  if (title !== undefined) update.title = title;
  if (memo !== undefined) update.memo = memo;
  if (category !== undefined) update.category = category;
  if (photoPath !== undefined) update.photo_path = photoPath;
  if (verdict !== undefined) update.verdict = verdict;

  const { data, error } = await supabase
    .from("recipes")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRecipe,
    onSuccess: (recipe) => {
      queryClient.setQueryData(recipeQueryKey(recipe.id), recipe);
      queryClient.invalidateQueries({
        queryKey: todoRecipesQueryKey(recipe.board_id),
      });
      queryClient.invalidateQueries({
        queryKey: archiveRecipesQueryKey(recipe.board_id),
      });
    },
  });
}

export interface CookAgainInput {
  id: string;
  boardId: string;
  /** 呼び出し時点のcook_count。+1した値とcooked_at=now()を保存する。 */
  currentCount: number;
}

/** 詳細画面の「また作った!」。cook_countを+1し、cooked_atを更新する。 */
export async function cookAgain({ id, currentCount }: CookAgainInput): Promise<Recipe> {
  const { data, error } = await supabase
    .from("recipes")
    .update({ cook_count: currentCount + 1, cooked_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function useCookAgain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cookAgain,
    onSuccess: (recipe) => {
      queryClient.setQueryData(recipeQueryKey(recipe.id), recipe);
      queryClient.invalidateQueries({
        queryKey: archiveRecipesQueryKey(recipe.board_id),
      });
    },
  });
}

export interface DeleteRecipeInput {
  id: string;
  boardId: string;
}

export async function deleteRecipe({ id }: DeleteRecipeInput): Promise<void> {
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRecipe,
    onSuccess: (_data, variables) => {
      queryClient.removeQueries({ queryKey: recipeQueryKey(variables.id) });
      queryClient.invalidateQueries({
        queryKey: todoRecipesQueryKey(variables.boardId),
      });
      queryClient.invalidateQueries({
        queryKey: archiveRecipesQueryKey(variables.boardId),
      });
    },
  });
}

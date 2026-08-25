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
  };
  if (memo !== undefined) update.memo = memo;
  if (photoPath !== undefined) update.photo_path = photoPath;

  const { error } = await supabase.from("recipes").update(update).eq("id", id);
  if (error) throw error;
}

export function useMarkRecipeCooked() {
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
    },
  });
}

export interface UpdateRecipeInput {
  id: string;
  boardId: string;
  title: string;
  memo: string | null;
  category: RecipeCategory | null;
  /** 写真を差し替えた場合のみ指定する。undefinedなら既存の写真を保持する。 */
  photoPath?: string;
}

/** 詳細画面での編集(タイトル・メモ・カテゴリ・写真)を保存する。 */
export async function updateRecipe({
  id,
  title,
  memo,
  category,
  photoPath,
}: UpdateRecipeInput): Promise<Recipe> {
  const update: Database["public"]["Tables"]["recipes"]["Update"] = {
    title,
    memo,
    category,
  };
  if (photoPath !== undefined) update.photo_path = photoPath;

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

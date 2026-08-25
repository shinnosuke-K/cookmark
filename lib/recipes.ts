import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Member } from "./board";
import type { Database, RecipeCategory } from "./database.types";

export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];

export const todoRecipesQueryKey = (boardId: string | undefined) =>
  ["recipes", "todo", boardId] as const;

export const boardMembersQueryKey = (boardId: string | undefined) =>
  ["boardMembers", boardId] as const;

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

/**
 * 「作った!」の最短経路: status='cooked' に更新するだけ(verdictは付けない)。
 * Task 4でリピート確定/イマイチのボトムシートに置き換わる。
 */
export function useMarkRecipeCooked() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; boardId: string }) => {
      const { error } = await supabase
        .from("recipes")
        .update({ status: "cooked", cooked_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: todoRecipesQueryKey(variables.boardId),
      });
    },
  });
}

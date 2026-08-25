import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ensureSignedIn, supabase } from "./supabase";
import type { Database } from "./database.types";

export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Board = Database["public"]["Tables"]["boards"]["Row"];

export const myMemberQueryKey = ["myMember"] as const;

/**
 * 自分(auth.uid())が紐付いている members 行を取得する。
 * 未参加なら null(エラーではない)。
 */
export async function getMyMember(): Promise<Member | null> {
  const session = await ensureSignedIn();
  if (!session) throw new Error("サインインに失敗しました");

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("anon_user_id", session.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useMyMember() {
  return useQuery({
    queryKey: myMemberQueryKey,
    queryFn: getMyMember,
  });
}

export async function getBoard(boardId: string): Promise<Board | null> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useBoard(boardId: string | undefined) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => getBoard(boardId as string),
    enabled: !!boardId,
  });
}

/** 新しいボードを作成し、呼び出し元を最初のmemberとして登録する。ボードIDを返す。 */
export async function createBoard(name: string): Promise<string> {
  await ensureSignedIn();
  const { data, error } = await supabase.rpc("create_board", { name });
  if (error) throw error;
  return data;
}

/** invite_token のボードに参加する。既存メンバーなら表示名を更新して成功する。ボードIDを返す。 */
export async function joinBoard(token: string, name: string): Promise<string> {
  await ensureSignedIn();
  const { data, error } = await supabase.rpc("join_board", { token, name });
  if (error) throw error;
  return data;
}

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myMemberQueryKey });
    },
  });
}

export function useJoinBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, name }: { token: string; name: string }) =>
      joinBoard(token, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myMemberQueryKey });
    },
  });
}

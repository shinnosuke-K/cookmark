import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// NEXT_PUBLIC_* が未設定でも `next build` のプリレンダーを落とさないよう、
// createClient に渡す時点ではダミー値にフォールバックする(createClient は
// 不正なURLだと即座に例外を投げるため)。実際の接続は実行時、値が無ければ
// Supabase 側の呼び出しでエラーになるだけで許容する。
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);

/**
 * セッションが無ければ匿名認証でサインインする。
 * layout や各ページのマウント時に呼び出す想定。
 */
export async function ensureSignedIn() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return data.session;
  }

  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }
  return signInData.session;
}

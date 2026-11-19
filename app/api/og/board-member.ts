import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const MEMBER_CHECK_TIMEOUT_MS = 3000;

/**
 * 呼び出し元がいずれかのボードのメンバーかを、リクエストのアクセストークンで確かめる。
 * Claude APIの呼び出し(従量課金)をメンバーだけに限るためのゲート。匿名認証は誰でも
 * サインインできるので、トークンが有効なだけでは通さない。membersのRLSは「自分が
 * 所属するボードの行」しか返さないため、呼び出し元のトークンでselectして1行でも
 * 返ればメンバーと判断できる(無効なトークンはPostgRESTがエラーにする)。
 */
export async function isBoardMember(request: NextRequest): Promise<boolean> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !supabaseAnonKey) return false;

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("members")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(MEMBER_CHECK_TIMEOUT_MS));
    return !error && data.length > 0;
  } catch {
    return false;
  }
}

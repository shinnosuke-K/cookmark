-- Security Advisor (lint 0028) 対応: サインイン前の anon ロールから
-- 書き込み系RPCの実行権を剥奪する。
-- Supabaseはデフォルト権限で新規関数に anon への EXECUTE を直接付与するため、
-- 0001 での「revoke from public」だけでは anon に権限が残っていた。
--
-- is_board_member は意図的に anon に残す: RLSポリシー内部から呼ばれるため、
-- 剥奪すると未サインインのリクエスト(keepaliveのヘルスチェック等)が
-- 空集合ではなく権限エラーになる。未サインインには false を返すだけで無害。

revoke execute on function public.create_board(name text) from anon;
revoke execute on function public.join_board(token text, name text) from anon;

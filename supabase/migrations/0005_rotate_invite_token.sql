-- 招待URLの再発行。既存の招待URLを知っている第三者(退去した相手など)の
-- アクセスを断ち切れるよう、呼び出し元が所属するboardのinvite_tokenを
-- 新しいランダム値に差し替える。

-- 呼び出し元(auth.uid())が所属するboardのinvite_tokenを再発行し、新しいトークンを返す。
-- 所属boardはmembersの最新行(created_at desc)から特定する(lib/board.tsのgetMyMemberと同じ規則)。
-- 未参加(membersに行がない)場合は例外を投げる。
create or replace function public.rotate_invite_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_board_id uuid;
  new_token text;
begin
  select board_id into target_board_id
  from public.members
  where anon_user_id = auth.uid()
  order by created_at desc
  limit 1;

  if target_board_id is null then
    raise exception 'not a member of any board';
  end if;

  new_token := gen_random_uuid()::text;

  update public.boards
  set invite_token = new_token
  where id = target_board_id;

  return new_token;
end;
$$;

revoke execute on function public.rotate_invite_token() from public;
revoke execute on function public.rotate_invite_token() from anon;
grant execute on function public.rotate_invite_token() to authenticated;

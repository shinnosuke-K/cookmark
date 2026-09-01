-- 招待URLの再発行。呼び出し元が所属するboardのinvite_tokenを新しいランダム値に
-- 差し替え、古い招待URLでの「今後の参加」をできなくする。
-- 注意: すでにjoin_board済みのメンバーのアクセスは失われない(メンバー削除の
-- 手段は本アプリには存在しない)。漏洩対策としては「参加される前に」回すこと。

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

-- Cookmark: initial schema (boards / members / recipes) + RLS + join flow RPCs + storage bucket.
-- Data model is verbatim from CLAUDE.md, plus RLS / RPC / storage additions described there.

-- ============================================================================
-- Tables
-- ============================================================================

-- ボード(夫婦で1つ)
create table boards (
  id uuid primary key default gen_random_uuid(),
  invite_token text unique not null,
  created_at timestamptz not null default now()
);

-- メンバー(匿名認証ユーザーとボードの紐付け)
create table members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id),
  anon_user_id uuid not null,        -- auth.uid()
  display_name text not null,        -- 「夫」「妻」など自由入力
  created_at timestamptz not null default now(),
  unique (board_id, anon_user_id)
);

-- レシピ
create table recipes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id),
  instagram_url text,
  post_shortcode text,               -- /p/xxx または /reel/xxx のxxx部分
  title text not null,
  author_handle text,
  status text not null default 'todo',  -- 'todo' | 'cooked'
  verdict text,                          -- 'repeat' | 'meh' | null
  category text,                         -- '主菜'|'副菜'|'汁物'|'麺・丼'|'おやつ'|null
  memo text,
  photo_path text,                       -- Supabase Storageのパス
  added_by uuid not null,                -- members.id
  cooked_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table boards enable row level security;
alter table members enable row level security;
alter table recipes enable row level security;

-- security definer ヘルパー: auth.uid() が対象boardのmembersに存在するか。
-- members/recipesのRLSポリシーからmembersを参照する際、ポリシー内で直接membersに
-- サブクエリを張ると無限再帰になるため、この関数越しに確認する。
create or replace function is_board_member(target_board_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from members
    where board_id = target_board_id
      and anon_user_id = auth.uid()
  );
$$;

revoke execute on function is_board_member(uuid) from public;
grant execute on function is_board_member(uuid) to authenticated;

-- boards: 所属boardの行のみ閲覧可。作成・更新・削除はRPC(security definer)経由のみ。
create policy "board members can view their board"
on boards for select
to authenticated
using (is_board_member(id));

-- members: 同じboardのmemberのみ select/insert/update/delete 可。
create policy "board members can view members"
on members for select
to authenticated
using (is_board_member(board_id));

create policy "board members can add members"
on members for insert
to authenticated
with check (is_board_member(board_id));

create policy "board members can update members"
on members for update
to authenticated
using (is_board_member(board_id))
with check (is_board_member(board_id));

create policy "board members can remove members"
on members for delete
to authenticated
using (is_board_member(board_id));

-- recipes: 同じboardのmemberのみ select/insert/update/delete 可。
create policy "board members can view recipes"
on recipes for select
to authenticated
using (is_board_member(board_id));

create policy "board members can add recipes"
on recipes for insert
to authenticated
with check (is_board_member(board_id));

create policy "board members can update recipes"
on recipes for update
to authenticated
using (is_board_member(board_id))
with check (is_board_member(board_id));

create policy "board members can delete recipes"
on recipes for delete
to authenticated
using (is_board_member(board_id));

-- ============================================================================
-- RPCs (security definer)
-- ============================================================================

-- ボードを作成し、招待トークンを発行し、作成者を最初のmemberとして登録する。
create or replace function create_board(name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_board_id uuid;
begin
  insert into boards (invite_token)
  values (gen_random_uuid()::text)
  returning id into new_board_id;

  insert into members (board_id, anon_user_id, display_name)
  values (new_board_id, auth.uid(), name);

  return new_board_id;
end;
$$;

revoke execute on function create_board(text) from public;
grant execute on function create_board(text) to authenticated;

-- invite_tokenに一致するboardへ参加する。既存memberなら display_name を更新して成功扱い。
create or replace function join_board(token text, name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_board_id uuid;
begin
  select id into target_board_id
  from boards
  where invite_token = token;

  if target_board_id is null then
    raise exception 'invalid invite token';
  end if;

  insert into members (board_id, anon_user_id, display_name)
  values (target_board_id, auth.uid(), name)
  on conflict (board_id, anon_user_id)
  do update set display_name = excluded.display_name;

  return target_board_id;
end;
$$;

revoke execute on function join_board(text, text) from public;
grant execute on function join_board(text, text) to authenticated;

-- ============================================================================
-- Storage: photos bucket
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- パスは {board_id}/... 形式。先頭フォルダ = board_id のmemberのみアクセス可。
create policy "board members can read their board photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'photos'
  and is_board_member((storage.foldername(name))[1]::uuid)
);

create policy "board members can upload their board photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'photos'
  and is_board_member((storage.foldername(name))[1]::uuid)
);

create policy "board members can update their board photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'photos'
  and is_board_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'photos'
  and is_board_member((storage.foldername(name))[1]::uuid)
);

create policy "board members can delete their board photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'photos'
  and is_board_member((storage.foldername(name))[1]::uuid)
);

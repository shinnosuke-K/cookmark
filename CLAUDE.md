# CLAUDE.md — Cookmark

## プロジェクト概要

**Cookmark** は、夫婦2人でInstagramのレシピ投稿を共有・管理するPWA。
InstagramのDMでレシピを送り合うと「どれを作ったか/まだか」が管理できない、という課題を解決する。

コア体験のループ:

1. インスタでレシピ投稿を見つける → リンクをコピー → Cookmarkを開いて貼り付けバナーから追加(未挑戦リストに積まれる)
2. 作ったらカードの「作った!」を1タップ → ボトムシートで「リピート確定 / イマイチ」の2択を即答(写真・メモは任意)
3. 「リピート確定」フィルタが、時間とともに夫婦の定番レシピ集になる

### プロダクト原則(実装判断に迷ったらここに戻る)

- **登録の摩擦を最小に**。追加とステータス変更は最短タップ数を最優先する
- **入力ゼロでも探せる**。自動で付く情報(ステータス・追加者・日付)だけで絞り込みが成立すること。タグは固定チップの任意入力のみ
- **静かな道具**。通知なし。リアルタイム同期なし。開いたときに最新であればよい
- **Instagram連携はベストエフォート**。自動取得が失敗しても手動入力で常に成立する二段構え
- **完全無料で運用**。有料サービス・独自ドメインは使わない

## ユーザーとスコープ

- 利用者は夫婦2人のみ。ストア公開・一般公開はしない
- ボードは1つを2人で共有。アカウント登録は不要(匿名認証+招待トークン)
- 通知機能は実装しない(意図的な仕様)

## 技術スタック

| 領域 | 選定 | 備考 |
|---|---|---|
| フレームワーク | Next.js (App Router) | 実質SPAとして構築。ほぼ全てクライアントコンポーネント |
| ホスティング | Vercel 無料枠 | `cookmark.vercel.app`(取れなければ `cookmark-app` 等) |
| DB / 認証 / ストレージ | Supabase 無料枠 | PostgreSQL + 匿名認証 + Storage |
| データ取得 | TanStack Query + @supabase/supabase-js | クライアントから直接Supabaseを叩く。認可はRLSが担保 |
| UI | Tailwind CSS + shadcn/ui | ボトムシートは vaul を使用 |
| PWA | Serwist (@serwist/next) | next-pwaは使わない(メンテ停滞のため)。オフラインキャッシュは頑張らない |
| 画像圧縮 | browser-image-compression | アップロード前に長辺1200px / quality 0.8 に圧縮 |

APIルート(Route Handler)は原則不要。例外は将来のOGP取得プロキシ `/api/og`(ベストエフォート機能、初期実装では不要)。

## データモデル

```sql
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
```

設計上の意図:

- `status` と `verdict` は**分離する**。「作ったが未評価」(ボトムシートを閉じた場合)を許容するため
- 評価は2択のみ(星評価にしない)。夫婦で意見が割れにくく即答できることを優先
- ステータスは共有で1つ。「どちらが作ったか」は区別しない(仕様として確定済み)

## 認可(Row Level Security)

- 全テーブルでRLSを有効化
- `recipes` / `members`: `auth.uid()` が同じ `board_id` の `members` に存在する行のみ select / insert / update / delete 可
- ボード参加は **security definer のRPC関数 `join_board(token text, name text)`** に閉じ込める:
  - invite_tokenが一致するボードを検索し、呼び出し元の `auth.uid()` を members にinsertする
  - invite_tokenをRLSポリシーに直接使わない(参加処理を関数に閉じることで漏れを防ぐ)
- ボード作成も同様にRPC `create_board(name text)` で行い、作成者をmembersに同時登録する

## 画面構成

```
app/
  layout.tsx            # manifest / viewport / QueryClientProvider / 匿名サインイン初期化
  page.tsx              # 未挑戦リスト(ホーム)+ 貼り付けバナー
  archive/page.tsx      # アーカイブ(作った一覧、リピート確定フィルタ)
  tonight/page.tsx      # 今夜どうする(未挑戦からランダム1件提案)
  join/[token]/page.tsx # 招待URL → join_board RPC → ホームへリダイレクト
  recipe/[id]/page.tsx  # 詳細(embed iframeの遅延ロード、メモ・写真編集)
lib/
  supabase.ts           # クライアント生成 + 匿名サインイン
  instagram.ts          # URL解析(shortcode抽出)
components/
  RecipeCard.tsx        # リスト用カード(「作った!」ボタン付き)
  CookedSheet.tsx       # 作った後のボトムシート(vaul)
  PasteBanner.tsx       # 貼り付けて追加バナー
```

### 各画面の要点

- **ホーム(未挑戦リスト)**: 最上部に「+ 貼り付けて追加」の大きなボタン/バナー。カードには タイトル / 投稿者 / 追加者 / カテゴリチップ / 「作った!」ボタン
- **作った!フロー**: タップ → vaulのボトムシートで「リピート確定 / イマイチ」の2択(大きなボタン2つ)+ 任意の写真・メモ欄。2択のどちらかを押せば即クローズしてアーカイブへ移動。シートを閉じた場合は `status='cooked', verdict=null` で保存
- **アーカイブ**: デフォルトは全件(新しい順)。「リピート確定のみ」トグルを目立つ位置に。カテゴリチップでの絞り込みとフリーワード検索(title / memo 対象)
- **今夜どうする**: 未挑戦リストからランダム1件をカード表示、「別のにする」で引き直し。リピート確定からも引ける切り替えを置く
- **詳細画面**: ここで初めてInstagram embed iframeを遅延ロード。メモ・写真・カテゴリの編集、削除

## Instagram連携の実装方針(重要な制約)

**Meta公式のoEmbed APIは使わない**(アプリ審査が必要で個人利用に見合わない)。

- **表示**: 詳細画面でのみ `https://www.instagram.com/p/{shortcode}/embed/captioned/` をiframeで遅延ロード。リスト画面ではiframeを使わない(重いため)。リストのサムネイルは、ユーザーがアップした写真があればそれを表示、なければプレースホルダー
- **URL解析**: 貼り付けテキストから `instagram\.com\/(p|reel|reels)\/([\w-]+)` でshortcodeを抽出。クエリパラメータや共有用の余分な文字列は除去
- **フォールバック**: 解析失敗・embed表示失敗はエラーにせず、タイトル手入力+写真添付のフォームに自然に流す。**自動取得はベストエフォート、手動が常に効く**
- タイトルは追加時に必須(自動取得できないため手入力前提。プレースホルダーで「例: 鶏むね肉のねぎ塩レモン」のように促す)

## クリップボード検知の実装方針

- `navigator.clipboard.readText()` は**ユーザー操作起点でしか呼べない**。iOS Safariでは毎回ネイティブのペースト許可UIが出る
- 「開いた瞬間に自動検知」は実装しない。ホームの「+ 貼り付けて追加」ボタンのタップハンドラ内で readText を呼ぶ
- readTextが拒否・失敗した場合は通常のURL入力フォームを表示

## PWA要件

- manifest: `name: "Cookmark"`, `short_name: "Cookmark"`, standalone表示
- service workerは最小構成(インストール可能性のためのみ)。オフライン対応は不要(Instagram閲覧にオンライン必須のため)
- **iOS対策(必須)**: iOSのPWAはSafariのサイトデータ削除で匿名認証セッションが消える。設定画面に**招待URL(再参加リンク)を常時表示**し、セッション消失時に同じボードへ再参加できる導線を必ず残す
- Android向け: manifestに `share_target` を定義し、Instagramの共有シートから直接追加できるようにする(iOSは非対応だが害はない)

## 無料枠の運用上の注意

- Supabase無料枠は1週間非アクティブでプロジェクトが一時停止する。GitHub Actionsのcronで週2回程度、ヘルスチェック用のselectを実行するワークフローを追加する
- 写真は必ずクライアント側で圧縮してからStorageへアップロード(無料枠1GBの節約)
- Vercel無料枠は非商用利用のみ(私用アプリなので問題なし)

## 実装順序

動くものを早く2端末で触ることを優先する。

1. **土台**: Supabaseプロジェクト作成、テーブル+RLS+`create_board`/`join_board` RPC、匿名サインイン
2. **参加フロー**: ボード作成 → 招待URL発行 → `join/[token]` で参加。2端末(2ブラウザ)で同一ボードが見えることを確認
3. **コア機能**: 貼り付け → レシピ追加 → 未挑戦リスト表示
4. **作った!フロー**: カードのボタン → ボトムシート2択 → アーカイブ表示
5. **仕上げ**: PWA化、写真アップロード、カテゴリチップ、フリーワード検索、今夜どうする、Supabase keep-alive

ステップ3完了時点で実利用を開始できる。4以降は使いながら追加する。

## コーディング規約・方針

- TypeScript strict。DBの型はSupabase CLIの型生成(`supabase gen types`)を使う
- コンポーネントは `"use client"` を基本とし、サーバーコンポーネントは layout 等の骨組みのみ
- データ取得はTanStack Queryに統一。`refetchOnWindowFocus: true` で「開いたら最新」を実現(Realtimeは使わない)
- モバイルファーストでスタイリング(想定利用はほぼスマホ)。最小フォントサイズ14px、タップターゲット44px以上
- UIテキストは日本語。トーンは簡潔・フレンドリー(「作った!」「今夜どうする?」)
- エラーは握りつぶさずトースト表示。ただしInstagram embed失敗だけは静かにフォールバック

## やらないこと(明示的な非スコープ)

- プッシュ通知・リマインダー
- Meta公式API連携・Instagramログイン
- 夫婦それぞれの「作った」個別管理(共有ステータス1つで確定)
- 自由入力タグ・星評価
- 3人以上のボード共有UI(データモデル上は可能だが、UIは2人前提でよい)
- 独自ドメイン、課金機能、多言語対応

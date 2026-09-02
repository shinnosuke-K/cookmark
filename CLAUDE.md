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
| ホスティング | Vercel 無料枠 | `cookmark-seven.vercel.app`(mainへのpushで自動デプロイ) |
| DB / 認証 / ストレージ | Supabase 無料枠 | PostgreSQL + 匿名認証 + Storage |
| データ取得 | TanStack Query + @supabase/supabase-js | クライアントから直接Supabaseを叩く。認可はRLSが担保 |
| UI | Tailwind CSS v4 | 新聞紙面風「Broadsheet」デザイン(Source Serif 4 + Phosphor Icons duotone)。シート・トースト・確認ダイアログは自作の軽量コンポーネント |
| PWA | Serwist (@serwist/next) | next-pwaは使わない(メンテ停滞のため)。オフラインキャッシュは頑張らない |
| 画像圧縮 | browser-image-compression | アップロード前に長辺1200px / quality 0.8 に圧縮 |

APIルート(Route Handler)は原則不要。例外はInstagram取得プロキシ `/api/og` と画像プロキシ `/api/og/image`(実装済み。ベストエフォート機能で、同一オリジン以外からの呼び出しは403)。

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
  created_at timestamptz not null default now(),
  cook_count integer not null default 0  -- 作った回数(「また作った!」で加算)
);
```

実スキーマの正は `supabase/migrations/`(番号順に適用)。

設計上の意図:

- `status` と `verdict` は**分離する**。「作ったが未評価」(ボトムシートを閉じた場合)を許容するため
- 評価は2択のみ(星評価にしない)。夫婦で意見が割れにくく即答できることを優先
- ステータスは共有で1つ。「どちらが作ったか」は区別しない(仕様として確定済み)
- 評価はあとから詳細画面で変更できる(未評価に戻すことも可)。「また作った!」で `cook_count` を加算する

## 認可(Row Level Security)

- 全テーブルでRLSを有効化
- `recipes` / `members`: `auth.uid()` が同じ `board_id` の `members` に存在する行のみ select / insert / update / delete 可
- ボード参加は **security definer のRPC関数 `join_board(token text, name text)`** に閉じ込める:
  - invite_tokenが一致するボードを検索し、呼び出し元の `auth.uid()` を members にinsertする
  - invite_tokenをRLSポリシーに直接使わない(参加処理を関数に閉じることで漏れを防ぐ)
- ボード作成も同様にRPC `create_board(name text)` で行い、作成者をmembersに同時登録する
- 招待URLの再発行はRPC `rotate_invite_token()`(呼び出し元の所属ボードのトークンを差し替える)
- これらのRPCは PUBLIC / anon から EXECUTE を剥奪し authenticated のみに許可する。例外は `is_board_member` で、RLSポリシー評価に使われるため anon にも実行を許可している(未サインインには false を返すだけ)

## 画面構成

```
app/
  layout.tsx            # manifest / フォント(Source Serif 4)/ Providers
  page.tsx              # 未挑戦リスト(ホーム)+ 貼り付けピル + 追加シート
  archive/page.tsx      # アーカイブ(リピート確定フィルタ・カテゴリ・検索)
  tonight/page.tsx      # 今夜どうする(ランダム提案)
  join/[token]/page.tsx # 招待URL → JoinScreen → ホームへ
  recipe/[id]/page.tsx  # 詳細(embed遅延ロード、編集・評価変更・また作った!・削除)
  settings/page.tsx     # 表示名、招待URLの表示・コピー・再発行
  api/og/               # Instagram取得プロキシ(route.ts / image/route.ts / same-origin.ts)
lib/
  supabase.ts           # クライアント生成 + 匿名サインイン
  board.ts / recipes.ts / photos.ts  # TanStack Queryフックとミューテーション
  instagram.ts          # URL解析(shortcode抽出)+ OGデータ取得
  instagram-embed.ts    # embedページのHTML解析(サーバー側)
  categories.ts / database.types.ts
components/
  RecipeCard / ArchiveRecipeCard / RecipeThumbnail   # リスト行とサムネイル
  AddRecipeForm / PasteBanner                        # 追加フロー
  CookedSheet / Sheet / ConfirmDialog / Toast        # シート・ダイアログ・トースト(自作)
  TabBar / JoinScreen / CategoryChips / VerdictBadge / InstagramEmbed
```

### 各画面の要点

- **ホーム(未挑戦リスト)**: 画面下部に「貼り付けて追加」のフローティングピル。行には サムネイル / タイトル / 投稿者 / 追加者 / カテゴリタグ / 「作った!」ボタン。追加フォームはボトムシートで、URLがあれば自動取得が走る(直前に追加したのと同じURLは再事前入力しない)
- **作った!フロー**: タップ → vaulのボトムシートで「リピート確定 / イマイチ」の2択(大きなボタン2つ)+ 任意の写真・メモ欄。2択のどちらかを押せば即クローズして保存し、アーカイブ画面へ遷移する。シートを閉じた場合は `status='cooked', verdict=null` で保存(ホームに留まる)
- **アーカイブ**: デフォルトは全件(新しい順)。「リピート確定のみ」トグルを目立つ位置に。カテゴリチップでの絞り込みとフリーワード検索(title / memo 対象)。行に色付きカテゴリタグ、リピート確定バッジには回数(×N)を表示
- **今夜どうする**: 未挑戦リストからランダム1件をカード表示、「別のにする」で引き直し(直前と同じものは出さない。候補1件のみなら「他の候補がありません」トースト)。リピート確定からも引ける切り替えを置く
- **詳細画面**: ここで初めてInstagram embed iframeを遅延ロード(高さ60vh・iframe内で投稿全体をスクロール可)。写真は表示しない(サムネイル専用)。タイトル・カテゴリ・メモ・評価の編集、「◯回作った」表示と「また作った!」ボタン、削除(確認ダイアログ)

## Instagram連携の実装方針(重要な制約)

**Meta公式のoEmbed APIは使わない**(アプリ審査が必要で個人利用に見合わない)。

- **表示**: 詳細画面でのみ `https://www.instagram.com/p/{shortcode}/embed/captioned/` をiframeで遅延ロード。リスト画面ではiframeを使わない(重いため)。リストのサムネイルは、ユーザーがアップした写真があればそれを表示、なければプレースホルダー
- **URL解析**: 貼り付けテキストから `instagram\.com\/(p|reel|reels)\/([\w-]+)` でshortcodeを抽出。クエリパラメータや共有用の余分な文字列は除去
- **自動取得**: 追加時に `/api/og`(embed/captionedページのサーバー側解析)でタイトル・投稿者・キャプション・画像をベストエフォートで取得する。タイトル/投稿者は未入力の間だけ事前入力し、キャプションはメモへ、画像は圧縮してサムネイルとして自動添付する。URL欄への手入力・貼り付けでも600msデバウンスで取得が走る
- **フォールバック**: 解析失敗・自動取得失敗・embed表示失敗はエラーにせず、タイトル手入力のフォームに自然に流す。**自動取得はベストエフォート、手動が常に効く**
- タイトルは追加時に必須(自動取得は補助。プレースホルダーで「例: 鶏むね肉のねぎ塩レモン」のように促す)

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

## 実装状況

初期実装(土台〜PWA化)は完了し、本番稼働中(Vercel + Supabase、夫婦で実利用)。UIはその後 Broadsheet デザインへ全面刷新済み。機能追加時は feature ブランチ → レビュー → main へマージ → push(スキーマ変更は `supabase db push` も)の流れで進める。

## コーディング規約・方針

- TypeScript strict。DBの型は `lib/database.types.ts` に手書きで維持する(スキーマ変更時に一緒に更新)
- コンポーネントは `"use client"` を基本とし、サーバーコンポーネントは layout 等の骨組みのみ
- データ取得はTanStack Queryに統一。`refetchOnWindowFocus: true` で「開いたら最新」を実現(Realtimeは使わない)
- モバイルファーストでスタイリング(想定利用はほぼスマホ)。最小フォントサイズ14px、タップターゲット44px以上
- ビジュアルはBroadsheetデザインに従う: 罫線・カードで区切らず、セリフの級数差と余白で階層を作る。デザイントークンは `app/globals.css`、デザイン資料は `docs/design_handoff_cookmark_ui/`(gitignore対象・コミットしない)
- UIテキストは日本語。トーンは簡潔・フレンドリー(「作った!」「今夜どうする?」)
- エラーは握りつぶさずトースト表示。ただしInstagram embed失敗だけは静かにフォールバック

## やらないこと(明示的な非スコープ)

- プッシュ通知・リマインダー
- Meta公式API連携・Instagramログイン
- 夫婦それぞれの「作った」個別管理(共有ステータス1つで確定)
- 自由入力タグ・星評価
- 3人以上のボード共有UI(データモデル上は可能だが、UIは2人前提でよい)
- 独自ドメイン、課金機能、多言語対応

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

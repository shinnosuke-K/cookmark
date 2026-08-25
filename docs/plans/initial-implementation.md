# Cookmark 初期実装プラン

Spec: プロジェクトルートの `CLAUDE.md`(サブエージェントにも自動で渡る)。本プランと矛盾する場合は CLAUDE.md が正。

## Global Constraints

- TypeScript strict。UIテキストは日本語(簡潔・フレンドリー)。モバイルファースト、最小フォント14px、タップターゲット44px以上
- ほぼ全て `"use client"`。データ取得は TanStack Query に統一、`refetchOnWindowFocus: true`。Realtime は使わない
- Supabase プロジェクトは未作成。環境変数 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` は `.env.local`(gitignore)で注入し、`.env.example` を置く。実接続を要するテストは書かない(ビルドと型チェックが通ること)
- Meta公式API・oEmbed は使わない。Instagram embed は詳細画面のみ、`/p/{shortcode}/embed/captioned/` の iframe 遅延ロード
- パッケージマネージャは npm。検証コマンドは `npm run build`(next build、型チェック込み)
- shadcn/ui はフル導入せず、必要な小さなUIコンポーネント(Button等)を Tailwind で自作してよい(依存削減)。ボトムシートは vaul を使う
- エラーはトースト表示(sonner を使用)。Instagram embed 失敗のみ静かにフォールバック

## Task 1: プロジェクト土台(Next.js scaffold + Supabase スキーマ定義)

- `create-next-app`(App Router, TS, Tailwind, ESLint, src なし, import alias `@/*`)でカレントディレクトリに生成。既存の CLAUDE.md / docs / .git は保持
- 依存追加: `@supabase/supabase-js`, `@tanstack/react-query`, `vaul`, `browser-image-compression`, `sonner`。PWA(Serwist)は Task 6
- `supabase/migrations/0001_init.sql` を作成: CLAUDE.md のデータモデル(boards / members / recipes)を verbatim で、加えて:
  - 全テーブル RLS 有効化。`recipes` / `members`: 自分(`auth.uid()`)が同じ board の members に居る行のみ select/insert/update/delete 可(CLAUDE.md の認可仕様どおり。members の存在確認は security definer のヘルパー関数 `is_board_member(board_id uuid)` を作って無限再帰を回避)
  - RPC `create_board(name text) returns uuid`(security definer): boards を invite_token 付きで作成(`invite_token` は `gen_random_uuid()` ベースなど推測困難な文字列)、呼び出し元を members に登録、board_id を返す
  - RPC `join_board(token text, name text) returns uuid`(security definer): token 一致の board を検索し members に insert(既存メンバーなら display_name を更新して成功扱い)、board_id を返す
  - Storage バケット `photos`(public ではなく authenticated read/write。パスは `{board_id}/...` で board メンバーのみアクセス可のポリシー)
- `lib/database.types.ts`: スキーマに対応する型定義を手書き(supabase gen types の出力互換の形。実プロジェクト未作成のため手書きでよい)
- `lib/supabase.ts`: ブラウザ用クライアント生成(`createClient<Database>`)+ `ensureSignedIn()`(セッションが無ければ `signInAnonymously()`)
- `app/layout.tsx`: 日本語 lang、viewport、QueryClientProvider(`refetchOnWindowFocus: true`)、sonner の Toaster。Provider は `app/providers.tsx`("use client")に分離
- `.env.example` を作成。`.gitignore` に `.env.local` が入っていることを確認
- 検証: `npm run build` が通ること

## Task 2: 参加フロー(ボード作成 / 招待 / 参加)

- `lib/board.ts`: 現在メンバー情報の取得(`getMyMember()`: members から `anon_user_id = auth.uid()` の行)、`create_board` / `join_board` RPC のラッパー
- `app/join/[token]/page.tsx`: 名前入力(自由入力、例:「夫」「妻」)→ `join_board` RPC → 成功でホームへリダイレクト。失敗はトースト+再試行
- オンボーディング: ホーム(`app/page.tsx`)で未参加(メンバー行なし)なら、ボード新規作成(名前入力→`create_board`)か「招待URLから参加してね」の案内を表示するウェルカム画面を出す
- `app/settings/page.tsx`: 自分の表示名と**招待URL(`{origin}/join/{invite_token}`)を常時表示**+コピーボタン。iOSセッション消失時の再参加導線(CLAUDE.md PWA要件)
- ヘッダー等に設定への導線を置く(下部タブバー: ホーム / アーカイブ / 今夜どうする / 設定。アーカイブ・今夜のページは Task 4-5 で実装するため、この時点ではプレースホルダーページを作る)
- 検証: `npm run build`

## Task 3: コア機能(貼り付け → レシピ追加 → 未挑戦リスト)

- `lib/instagram.ts`: `instagram\.com\/(p|reel|reels)\/([\w-]+)` で shortcode 抽出。`parseInstagramUrl(text): { shortcode, cleanUrl } | null`。クエリパラメータ除去。ユニットテスト不要(ビルドのみ)
- `components/PasteBanner.tsx`: ホーム最上部の大きな「+ 貼り付けて追加」ボタン。タップハンドラ内で `navigator.clipboard.readText()`(拒否・失敗時は手動URL入力欄を表示)。URL解析成否に関わらず追加フォーム(ボトムシート or ページ内フォーム)へ: タイトル(必須、placeholder「例: 鶏むね肉のねぎ塩レモン」)、カテゴリチップ(主菜/副菜/汁物/麺・丼/おやつ、任意)、投稿者ハンドル(解析できれば自動、なければ空)。URLなし手動追加も可
- レシピ insert: `status='todo'`, `added_by` は自分の members.id
- `components/RecipeCard.tsx`: タイトル / 投稿者 / 追加者名 / カテゴリチップ / 「作った!」ボタン(44px+)。サムネイルはユーザー写真があれば表示、なければプレースホルダー。カードタップで詳細(`/recipe/[id]`、詳細ページは Task 5)
- `app/page.tsx`: 未挑戦(`status='todo'`)リストを新しい順で表示(TanStack Query)。「作った!」ボタンはこの時点では `status='cooked'` に更新するだけ(ボトムシートは Task 4)
- Android share_target 受け(`app/page.tsx` で `?url=` or `?text=` クエリを拾い追加フォームに流す。manifest 定義自体は Task 6)
- 検証: `npm run build`

## Task 4: 作った!フロー + アーカイブ

- `components/CookedSheet.tsx`(vaul): 「リピート確定」「イマイチ」の大きな2ボタン+任意の写真添付・メモ欄。どちらか押下で `status='cooked'`, `verdict`, `cooked_at=now()`(+入力があれば memo/photo)を保存し即クローズ。シートを閉じただけなら `status='cooked'`, `verdict=null` で保存
- 写真アップロード: `browser-image-compression` で長辺1200px / quality 0.8 に圧縮 → Storage `photos/{board_id}/{recipe_id}-{timestamp}.jpg` へアップロード → `photo_path` 保存
- `app/page.tsx` の「作った!」を CookedSheet 起動に差し替え
- `app/archive/page.tsx`: `status='cooked'` を新しい順。「リピート確定のみ」トグルを目立つ位置に、カテゴリチップ絞り込み、フリーワード検索(title / memo、クライアントサイドフィルタでよい)。カードに verdict 表示(リピート確定/イマイチ/未評価)
- 検証: `npm run build`

## Task 5: 今夜どうする + 詳細画面

- `app/tonight/page.tsx`: 未挑戦からランダム1件をカード表示、「別のにする」で引き直し。「リピート確定から引く」切り替えトグル
- `app/recipe/[id]/page.tsx`: Instagram embed iframe(`https://www.instagram.com/p/{shortcode}/embed/captioned/`)を遅延ロード(IntersectionObserver か「読み込む」ボタン。embed 失敗はエラーにせず静かに非表示・写真/タイトル表示へフォールバック)。タイトル・メモ・カテゴリ・写真の編集、レシピ削除(確認ダイアログ)、元投稿を開くリンク
- 検証: `npm run build`

## Task 6: PWA化 + 運用

- Serwist(`@serwist/next`)導入: 最小構成の service worker(インストール可能性のためのみ。オフラインキャッシュは頑張らない)
- `app/manifest.ts`: `name/short_name: "Cookmark"`, standalone, theme/背景色, アイコン(512/192 のプレースホルダーアイコンを生成して `public/` に配置)、Android向け `share_target`(GET, `url`/`text`/`title` パラメータ → `/` に渡す)
- `.github/workflows/keepalive.yml`: cron 週2回、Supabase へヘルスチェック select(curl で REST API を叩く。URL/キーはリポジトリシークレット `SUPABASE_URL` / `SUPABASE_ANON_KEY` 参照)
- `README.md`: セットアップ手順(Supabase プロジェクト作成 → migration 適用 → 匿名認証の有効化 → env 設定 → Vercel デプロイ → シークレット設定)
- 検証: `npm run build`

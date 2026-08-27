# Cookmark

夫婦2人でInstagramのレシピ投稿を共有・管理するPWAです。InstagramのDMでレシピを送り合うだけでは「どれを作ったか/まだ作っていないか」が分からなくなる、という課題を解決します。インスタで見つけたレシピのリンクを貼り付けて追加し、作ったら「リピート確定 / イマイチ」を1タップで記録することで、時間とともに夫婦の定番レシピ集ができあがっていきます。夫婦2人だけの利用を前提とした個人プロジェクトで、一般公開やアカウント登録機能はありません。

## セットアップ

### 1. Supabaseプロジェクトを作成する

1. [Supabase](https://supabase.com/) で新規プロジェクトを作成する(無料枠でOK)。
2. プロジェクトの `Settings > API` から `Project URL` と `anon public` キーを控えておく。

### 2. マイグレーションを適用する

`supabase/migrations/0001_init.sql` にテーブル定義・RLSポリシー・`create_board` / `join_board` RPC関数がすべて含まれています。以下のいずれかの方法で適用してください。

- **SQL Editorから直接実行する場合**: SupabaseダッシュボードのSQL Editorを開き、`supabase/migrations/0001_init.sql` の中身を貼り付けて実行する。
- **Supabase CLIを使う場合**:

  ```bash
  supabase link --project-ref <プロジェクトref>
  supabase db push
  ```

### 3. 匿名認証を有効化する

Supabaseダッシュボードの `Authentication > Sign In / Providers` で **Anonymous Sign-Ins** を有効化してください(デフォルトでは無効になっています)。これを忘れるとアプリ初回起動時のサインインが失敗します。

### 4. 環境変数を設定する

`.env.example` をコピーして `.env.local` を作成し、手順1で控えた値を設定します。

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxx
```

### 5. ローカルで動かす(クラウドのSupabaseを使う場合)

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くとボード作成/参加画面が表示されます。2端末(2ブラウザ)で同じ招待URLから参加すると、同一ボードを共有できているか確認できます。

なお本番ビルド(`npm run build`)は Serwist の InjectManifest 戦略(webpackプラグイン)を使う都合上 `next build --webpack` を実行します(Next.js 16のデフォルトであるTurbopackは現時点でServwistの当該戦略に未対応のため)。`npm run build` にすでに組み込まれているので、意識する必要はありません。


### 5b. すべてローカルで動かす(Docker + Supabase CLI)

クラウドにプロジェクトを作らなくても、Dockerがあれば全部ローカルで試せます。

```bash
# Supabaseローカルスタックを起動(初回はイメージ取得で数分かかる)
npx supabase start

# 起動ログに表示される ANON_KEY を .env.local に設定
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>

npm run dev
```

- マイグレーション(`supabase/migrations/`)と匿名認証の有効化(`supabase/config.toml` の `enable_anonymous_sign_ins = true`)は自動で適用されます
- 管理画面(Supabase Studio)は `http://127.0.0.1:54323`
- データを初期化したいときは `npx supabase db reset`
- 終了は `npx supabase stop`(データは保持されます)

### 6. Vercelにデプロイする

1. GitHubリポジトリをVercelにインポートする。
2. Vercelプロジェクトの `Settings > Environment Variables` に、手順4と同じ2つの環境変数(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`)を設定する。
3. デプロイ後、発行されたURL(例: `https://cookmark.vercel.app`)にアクセスしてボードを作成する。

Vercelの無料枠は非商用利用に限られますが、本アプリは私用のため問題ありません。

### 7. GitHub Actions のシークレットを設定する(Supabaseの自動停止対策)

Supabase無料枠は1週間アクセスがないとプロジェクトが自動的に一時停止します。これを防ぐため `.github/workflows/keepalive.yml` が週2回(月・木)Supabaseへヘルスチェック用のSELECTリクエストを送ります。

GitHubリポジトリの `Settings > Secrets and variables > Actions` に以下のシークレットを設定してください。

| シークレット名 | 値 |
|---|---|
| `SUPABASE_URL` | 手順1で控えた Project URL |
| `SUPABASE_ANON_KEY` | 手順1で控えた anon public キー |

設定を忘れるとワークフローが失敗し続けるので、デプロイ後に一度 `Actions` タブから手動実行(`workflow_dispatch`)して成功することを確認してください。

## iOS PWAでの注意点(セッション消失時の再参加)

iOSのSafari/PWAはブラウザのサイトデータを削除すると匿名認証のセッションも一緒に消え、同じボードに再ログインする手段がなくなります。この対策として、アプリの「設定」画面に**招待URL(再参加用リンク)を常時表示**しています。セッションが消えてしまった場合は、この招待URLを開き直すことで同じボードに再参加できます。招待URLはパートナーとのやり取り(メモアプリやメッセージなど)に控えておくことをおすすめします。

## 技術スタック

- Next.js (App Router) + TypeScript
- Supabase (PostgreSQL + 匿名認証 + Storage)
- TanStack Query
- Tailwind CSS + vaul(ボトムシート)
- Serwist(PWAのインストール可能性のための最小構成のservice worker。オフラインキャッシュは行いません)

詳細な仕様・設計判断は [`CLAUDE.md`](./CLAUDE.md) を参照してください。

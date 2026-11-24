# Cookmark

夫婦2人でInstagramのレシピ投稿を共有・管理するPWAです。InstagramのDMでレシピを送り合うだけでは「どれを作ったか/まだ作っていないか」が分からなくなる、という課題を解決します。インスタで見つけたレシピのリンクを貼り付けて追加し、作ったら「リピート確定 / イマイチ」を1タップで記録することで、時間とともに夫婦の定番レシピ集ができあがっていきます。夫婦2人だけの利用を前提とした個人プロジェクトで、一般公開やアカウント登録機能はありません。

## 主な機能

- **貼り付けて追加**: InstagramのURLを貼り付けると、タイトル・投稿者・写真・キャプション(材料表)をベストエフォートで自動取得(`/api/og`)。取得に失敗しても手動入力で必ず追加できます。Androidは共有シートからの直接追加にも対応(share_target)
- **作った!フロー**: 1タップでボトムシートを開き「リピート確定 / イマイチ」を即答。評価はあとから詳細画面で変更でき、「また作った!」でリピート回数をカウントします
- **アーカイブ**: リピート確定フィルタ・カテゴリ・フリーワード検索で絞り込み
- **今夜どうする**: 未挑戦またはリピート確定からランダムに1件提案
- **設定**: 招待URLの表示・コピー・再発行(漏洩時の無効化)

## セットアップ

### 1. Supabaseプロジェクトを作成する

1. [Supabase](https://supabase.com/) で新規プロジェクトを作成する(無料枠でOK、リージョンはTokyo推奨)。
2. プロジェクトの `Settings > API Keys` から `Project URL` と **Publishable key**(`sb_publishable_…`)を控えておく(旧方式の `anon public` キーでも動作します)。

### 2. マイグレーションを適用する

`supabase/migrations/` に全スキーマが番号順に入っています。

- **Supabase CLIを使う場合(推奨)**:

  ```bash
  supabase link --project-ref <プロジェクトref>
  supabase db push
  ```

  ※ `supabase link` には[Personal Access Token](https://supabase.com/dashboard/account/tokens)(`sbp_…`)での `supabase login` が必要です(APIキーとは別物)。

- **SQL Editorから直接実行する場合**: ダッシュボードのSQL Editorで、`supabase/migrations/` のファイルを番号順にすべて実行する。

### 3. 匿名認証を有効化する

Supabaseダッシュボードの `Authentication > Sign In / Providers` で **Anonymous Sign-Ins** を有効化してください(デフォルトでは無効になっています)。これを忘れるとアプリ初回起動時のサインインが失敗します。あわせて **Email プロバイダは無効化**しておくと、使わない入口を閉じられます。

### 4. 環境変数を設定する

`.env.example` をコピーして `.env.local` を作成し、手順1で控えた値を設定します。

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
```

URLはパス無しのオリジンだけを指定します(`/rest/v1` などを付けるとアプリが `Invalid path` エラーになります)。

### 5. ローカルで動かす(クラウドのSupabaseを使う場合)

Node.js・Supabase CLI・Vercel CLIのバージョンは [mise](https://mise.jdx.dev/) で管理しています(`mise.toml`)。

```bash
# 初回のみ: miseのインストールとシェルへの組み込み
brew install mise
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc && exec zsh

# プロジェクトで固定されたツール(Node.js / Supabase CLI / Vercel CLI)を導入
mise install
```

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くとボード作成/参加画面が表示されます。2端末(2ブラウザ)で同じ招待URLから参加すると、同一ボードを共有できているか確認できます。

なお開発・本番ビルドとも Serwist の InjectManifest 戦略(webpackプラグイン)を使う都合上 `--webpack` フラグ付きで実行します(Next.js 16のデフォルトであるTurbopackは現時点で当該戦略に未対応のため)。`npm run dev` / `npm run build` にすでに組み込まれているので、意識する必要はありません。

### 5b. すべてローカルで動かす(Docker + Supabase CLI)

クラウドにプロジェクトを作らなくても、Dockerがあれば全部ローカルで試せます。

```bash
# Supabaseローカルスタックを起動(初回はイメージ取得で数分かかる)
supabase start

# 起動ログに表示される PUBLISHABLE_KEY(または ANON_KEY)を .env.local に設定
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<キー>

npm run dev
```

- マイグレーション(`supabase/migrations/`)と匿名認証の有効化(`supabase/config.toml` の `enable_anonymous_sign_ins = true`)は自動で適用されます
- 管理画面(Supabase Studio)は `http://127.0.0.1:54323`
- データを初期化したいときは `supabase db reset`

2回目以降の日常の起動・停止は次の2コマンドだけです。

```bash
# 起動(Supabaseローカルスタック → devサーバーの順)
supabase start && npm run dev
```

```bash
# 停止(データは保持されます)
supabase stop
```

### 6. Vercelにデプロイする

1. GitHubリポジトリをVercelにインポートする。
2. Vercelプロジェクトの `Settings > Environment Variables` に、手順4と同じ2つの環境変数(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`)を設定する。
3. デプロイ後、発行されたURL(例: `https://cookmark-xxxx.vercel.app`)にアクセスしてボードを作成する。

Vercelの無料枠は非商用利用に限られますが、本アプリは私用のため問題ありません。以後は `main` へのpushで自動デプロイされます(スキーマ変更を含む場合は `supabase db push` も忘れずに)。

### 7. Claude APIの認証を設定する(任意)

レシピを追加するとき、キャプションから料理名・カテゴリ・食材・調味料をClaude APIで抜き出します。この設定をしなくてもアプリは動きます。その場合の自動取得は、キャプションの1行目をタイトルにするだけの結果になります。

認証は、ローカル開発と本番で方式が違います。

| 環境 | 方式 | 置くもの |
|---|---|---|
| ローカル開発 | APIキー | `.env.local` の `ANTHROPIC_API_KEY` |
| 本番(Vercel) | Workload Identity Federation(OIDC) | IDだけ。APIキーは置かない |

本番にAPIキーを置かないのは、漏れたときの被害を小さくするためです。VercelはデプロイごとにOIDCトークン(署名付きの短命なJWT)を関数へ渡します。サーバーはこれをAnthropicに送り、短時間で失効するアクセストークンと交換してからClaudeを呼びます。長く有効な秘密はどこにも保存されません。

#### 7-1. VercelのOIDCトークンの中身を確認する

Vercel側で有効化の操作は要りません。OIDCトークンはHobbyを含む全プランで、すべてのデプロイに自動で発行されます。プロジェクトの `Settings > Security` にある OIDC Federation の発行元モードは、既定の **Team** のままにします。Anthropic側に登録する値は、このモードで決まります。

| クレーム | 値の形 |
|---|---|
| `iss`(発行元) | `https://oidc.vercel.com/<チームslug>` |
| `aud`(対象) | `https://vercel.com/<チームslug>` |
| `sub`(主体) | `owner:<チームslug>:project:<プロジェクト名>:environment:<環境>` |

個人アカウントでも「チームslug」はあります(アカウント名と同じ)。有効期間はproductionのトークンが2時間、開発用が12時間です。

実際の値は、開発用のトークンを取得して確かめられます。出力先を指定しないと `.env.local` を上書きするので、必ず別名を指定してください。確認が済んだらファイルは削除します。

```bash
mise exec -- vercel env pull .env.vercel
```

`.env.vercel` の `VERCEL_OIDC_TOKEN` がトークンです。`.` で区切った2番目の部分をBase64デコードするとクレームが読めます。開発用トークンの `sub` は末尾が `environment:development` になります。

#### 7-2. Anthropic Console で3つ作る

[Claude Console](https://platform.claude.com/) のWorkload Identity Federationの設定で、次の3つを作ります。

1. **発行元(Custom OIDC)**: Issuer URLに `iss` の値を登録します。**トークンの最大有効期間を2時間以上**にしてください。既定は1時間で、そのままだとVercelのproductionトークン(2時間有効)が交換時に拒否されます。
2. **サービスアカウント**: 交換したアクセストークンが名乗る主体です。名前は任意です(例: `cookmark-vercel`)。
3. **フェデレーションルール**: 上の発行元とサービスアカウントを結び付け、受け付けるトークンの条件を決めます。subjectに `sub` の値、audienceに `aud` の値を、どちらも完全一致で指定します。

ルールのsubjectを `environment:production` まで書くのが要点です。プレビューデプロイのトークンは `environment:preview` になるので、プルリクエストのブランチに置かれたコードからは交換できません。

Consoleの自動リロード(クレジットの自動購入)は無効のままにします。Maxプランに毎月付与されるクレジットを使い切ると、Claudeの呼び出しが失敗して自動取得が正規表現の結果へ戻るだけで、課金は発生しません。

#### 7-3. Vercelの環境変数にIDを登録する

作成後にConsoleへ表示されるIDを、Vercelプロジェクトの `Settings > Environment Variables` に登録します。

| 変数名 | 値 | 必須 |
|---|---|---|
| `ANTHROPIC_FEDERATION_RULE_ID` | フェデレーションルールのID | 必須 |
| `ANTHROPIC_ORGANIZATION_ID` | 組織のID(Consoleの組織設定に表示されるUUID。個人契約でも組織は1つあります) | 必須 |
| `ANTHROPIC_SERVICE_ACCOUNT_ID` | サービスアカウントのID | 任意 |
| `ANTHROPIC_WORKSPACE_ID` | 使うワークスペースのID | 任意 |

- 環境は **Productionだけ** にチェックを入れます。PreviewとDevelopmentには登録しません
- 種類は **Config**(保存後も値を表示できるほう)で構いません。どれも識別子であって秘密ではなく、これだけではトークンを交換できないためです
- `ANTHROPIC_API_KEY` はVercelに登録しません

CLIから登録する場合は、変数ごとに次を実行して値を入力します。

```bash
mise exec -- vercel env add ANTHROPIC_FEDERATION_RULE_ID --environment production
```

環境変数はデプロイ時に読み込まれるので、登録後に再デプロイが必要です(`main` へのpush、またはVercelのダッシュボードからRedeploy)。

#### 7-4. 動作を確認する

本番でInstagramのレシピURLを貼り付けて追加シートを開きます。カテゴリと食材が事前入力されれば、トークンの交換からClaudeの呼び出しまで通っています。

タイトルしか入らないときは、Vercelの `Logs` で `/api/og` の出力に「レシピの構造化に失敗しました」が出ていないかを見ます。

| ログの内容 | 疑うところ |
|---|---|
| トークンの交換(`/v1/oauth/token`)で失敗 | 発行元の最大有効期間が2時間未満、ルールのsubject / audienceの不一致、ルールIDか組織IDの誤り |
| ログが何も出ない | 環境変数がProductionに無い、または登録後に再デプロイしていない(設定が無いとClaudeを呼ばずに終わります) |
| Claudeの呼び出しが4xxで失敗 | クレジット切れ、ワークスペースIDの誤り |

#### ローカル開発でClaudeを使う場合

Consoleで発行したAPIキーを `.env.local` の `ANTHROPIC_API_KEY` に設定します。`ANTHROPIC_FEDERATION_RULE_ID` と `ANTHROPIC_ORGANIZATION_ID` の両方があるとOIDCが優先されるので、ローカルではこの2つを空のままにします。

### 8. GitHub Actions のシークレットを設定する(Supabaseの自動停止対策)

Supabase無料枠は1週間アクセスがないとプロジェクトが自動的に一時停止します。これを防ぐため `.github/workflows/keepalive.yml` が週2回(月・木)Supabaseへヘルスチェック用のSELECTリクエストを送ります。

GitHubリポジトリの `Settings > Secrets and variables > Actions` に以下のシークレットを設定してください。

| シークレット名 | 値 |
|---|---|
| `SUPABASE_URL` | 手順1で控えた Project URL |
| `SUPABASE_ANON_KEY` | 手順1で控えた Publishable key |

設定を忘れるとワークフローが失敗し続けるので、デプロイ後に一度 `Actions` タブから手動実行(`workflow_dispatch`)して成功することを確認してください。

## iOS PWAでの注意点(セッション消失時の再参加)

iOSのSafari/PWAはブラウザのサイトデータを削除すると匿名認証のセッションも一緒に消え、同じボードに再ログインする手段がなくなります。この対策として、アプリの「設定」画面に**招待URL(再参加用リンク)を常時表示**しています。セッションが消えてしまった場合は、この招待URLを開き直すことで同じボードに再参加できます。招待URLはパートナーとのやり取り(メモアプリやメッセージなど)に控えておくことをおすすめします。招待URLを再発行した場合は、控えも新しいURLに更新してください。

## 技術スタック

- Next.js (App Router) + TypeScript
- Supabase (PostgreSQL + 匿名認証 + Storage)
- TanStack Query(`refetchOnWindowFocus` で「開いたら最新」。Realtimeは使いません)
- Tailwind CSS v4 — 新聞紙面風の「Broadsheet」デザイン(Source Serif 4 + Phosphor Icons duotone)
- Serwist(PWAのインストール可能性のための最小構成のservice worker。オフラインキャッシュは行いません)
- browser-image-compression(写真は長辺1200pxに圧縮してからアップロード)
- Claude API(`claude-haiku-5-5`。キャプションから料理名・カテゴリ・食材・調味料を構造化。本番の認証はVercelのOIDCによるWorkload Identity Federation)

詳細な仕様・設計判断は [`CLAUDE.md`](./CLAUDE.md) を参照してください。

# practice-ai-review

GitHub PR に `/ai-review` とコメントすると、Claude AI がコードレビューして結果をコメントで返す CLI ツール。GitHub Actions から呼び出される。

## 動作フロー

```
PR コメント "/ai-review"
  → GitHub Actions トリガー
  → PR の diff を取得
  → Claude API でレビュー
  → 結果を PR にコメント投稿
```

## セットアップ

### 1. Secrets の登録

リポジトリの **Settings → Secrets and variables → Actions** に以下を追加：

| シークレット名 | 説明 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API キー |

`GITHUB_TOKEN` は GitHub Actions が自動で提供するため登録不要。

### 2. ワークフローの配置

`.github/workflows/ai-review.yml` がリポジトリに含まれていれば自動で有効になる。

## 使い方

PR のコメント欄に以下を投稿するだけ：

```
/ai-review
```

追加のレビュー指示を書くことも可能：

```
/ai-review セキュリティの観点を重点的にレビューしてください
```

## プロジェクト構成

```
src/
├── main.ts                      # エントリーポイント
├── app.module.ts                # ルートモジュール
├── review.service.ts            # ユースケース層（フロー制御）
├── config/
│   ├── config.module.ts
│   └── config.service.ts        # 環境変数の検証・管理
├── github/
│   ├── github.module.ts
│   └── github.service.ts        # PR diff 取得・コメント投稿
└── ai-review/
    ├── ai-review.module.ts
    └── ai-review.service.ts     # Claude API 呼び出し
```

## 環境変数

| 変数名 | 説明 |
|---|---|
| `GITHUB_TOKEN` | GitHub API 認証トークン |
| `ANTHROPIC_API_KEY` | Anthropic API キー |
| `GITHUB_REPOSITORY` | `owner/repo` 形式のリポジトリ名 |
| `PR_NUMBER` | レビュー対象の PR 番号 |
| `COMMENT_BODY` | トリガーとなったコメント本文 |

ローカル実行時は `.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

## ローカルでの開発

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# 実行（環境変数を設定した上で）
node dist/main.js
```

## テスト

### ユニットテスト（外部 API 不要）

```bash
npm run test          # 全テスト実行
npm run test:cov      # カバレッジ付き
npm run test:watch    # ウォッチモード
```

### 実際の動作確認（実 API を使う）

`.env` を作成して実際の値を設定する：

```bash
cp .env.example .env
```

```env
GITHUB_TOKEN=ghp_xxxx              # GitHub Personal Access Token
ANTHROPIC_API_KEY=sk-ant-xxxx      # Anthropic API キー
GITHUB_REPOSITORY=owner/repo       # 対象リポジトリ（例: octocat/hello-world）
PR_NUMBER=1                        # テストしたい PR 番号
COMMENT_BODY=/ai-review            # トリガーコメント
```

`dotenv` を使って実行：

```bash
node -r dotenv/config dist/main.js
```

#### GITHUB_TOKEN の取得

GitHub の **Settings → Developer settings → Personal access tokens → Tokens (classic)** で作成。

| 権限 | 用途 |
|---|---|
| `public_repo` | パブリックリポジトリの場合 |
| `repo` | プライベートリポジトリの場合 |

## License

MIT

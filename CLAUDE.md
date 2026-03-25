# CLAUDE.md

## プロジェクト概要

GitHub PR に `/ai-review` とコメントすると Claude AI がコードレビューして結果をコメントで返す CLI ツール。GitHub Actions から `node dist/main.js` で呼び出される。NestJS の DI コンテナを活用しているが、HTTP サーバーは起動しない。

## よく使うコマンド

```bash
npm run build       # TypeScript をコンパイル
npm run start:dev   # watch モードで起動（開発時）
npm run lint        # ESLint + Prettier 自動修正
npm run test        # Jest テスト実行
npm run test:cov    # カバレッジ付きテスト
```

## アーキテクチャ

```
main.ts
  └─ NestFactory.createApplicationContext(AppModule)
       └─ ReviewService.run()           # フロー制御
            ├─ ConfigService.get()      # 環境変数の検証・取得
            ├─ GithubService.getPullRequestDiff()   # Octokit で diff 取得
            ├─ AiReviewService.review()             # Claude API 呼び出し
            └─ GithubService.postComment()          # レビュー結果を投稿
```

### モジュール構成

| モジュール | 責務 |
|---|---|
| `ConfigModule` | 環境変数の検証・管理。`@Global()` でどこからでも注入可能 |
| `GithubModule` | Octokit を使った PR diff 取得とコメント投稿 |
| `AiReviewModule` | `@anthropic-ai/sdk` を使った Claude API 呼び出し |

## 環境変数

GitHub Actions から自動でセットされる。ローカル開発時は `.env` ファイルを使用。

| 変数名 | 必須 | 説明 |
|---|---|---|
| `GITHUB_TOKEN` | yes | GitHub API 認証トークン |
| `ANTHROPIC_API_KEY` | yes | Anthropic API キー |
| `GITHUB_REPOSITORY` | yes | `owner/repo` 形式 |
| `PR_NUMBER` | yes | レビュー対象 PR 番号（数値） |
| `COMMENT_BODY` | yes | トリガーコメントの本文 |

## トリガーワード

`review.service.ts` の `TRIGGER_WORD` 定数で定義。現在は `/ai-review`。コメント本文にこの文字列が含まれない場合は何もせず正常終了する。

## 重要な設計判断

- **HTTP サーバーなし**: `NestFactory.createApplicationContext` を使い、HTTP リスナーを起動しない
- **diff の上限**: `github.service.ts` で 100,000 文字に切り捨て（Claude のトークン上限対策）
- **エラー時の挙動**: レビュー失敗時は PR にエラーコメントを投稿した上で `process.exit(1)` する
- **Claude モデル**: `ai-review.service.ts` で `claude-opus-4-6` を使用

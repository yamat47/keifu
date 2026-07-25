# ADR-0003: Cloudflare Workers + Static Assets を使い、ローカルは Vite プラグインで動かす

- Status: Accepted
- Date: 2026-07-26

## 状況

無料枠で運用できるホスティングを選ぶ。当初案は Cloudflare Pages + Pages Functions + D1 だった。

同時に「まずローカルで動く形にしたい」という要求がある。
Cloudflare アカウントの用意やデプロイ設定が、実装を始める前提になってはいけない。

## 決定

- ホスティングは **Cloudflare Workers + Static Assets**（Pages Functions ではない）
- API は Hono
- DB は D1
- ローカル開発は **`@cloudflare/vite-plugin`** で、Vite dev server 上で workerd と D1 を動かす
- DB アクセスは ORM を使わず生 SQL

## 理由

**なぜ Pages ではなく Workers か**
Cloudflare は新規プロジェクトを Workers + Static Assets に寄せており、
Pages は実質的に維持モードに入っている。
無料枠と D1 の使い勝手は同じで、後々の機能追加で不利にならない側を選ぶ。

**なぜ `wrangler dev` 単体ではないか**
`wrangler dev` だけだと Vite の HMR が効かず、フロントエンドの開発体験が大きく落ちる。
`@cloudflare/vite-plugin` は Vite dev server 上で Worker を workerd で実行し、
D1 も Miniflare でローカルエミュレートするので、HMR を保ったまま API まで通しで動く。

**なぜローカル完結を重視するか**
D1 のローカル実体は `.wrangler/state/` 配下の SQLite ファイルなので、
Cloudflare アカウントが無くても Phase 4（編集機能）まで完走できる。
デプロイを後回しにできることで、最初から最後まで手元で試行錯誤できる。

**なぜ ORM を使わないか**
テーブルは3つ、データは50人規模。
Drizzle などの型安全とマイグレーション生成は魅力だが、
学習コストと設定の複雑さが、この規模で得られる利益を上回る。
マイグレーションは `wrangler d1 migrations` で足りる。

型安全は API 境界の Zod スキーマで担保し、SQL の結果は明示的にマッピングする。

## 採用しなかった案

**Vercel / Netlify + 外部 DB**
無料枠で完結させるという制約から外れる。DB を別サービスに置くと管理対象が増える。

**SQLite ファイルを直接置く（DB サービスを使わない）**
Workers はファイルシステムを持たないため成立しない。

**Drizzle ORM**
上記の通り、この規模では割に合わない。
テーブルが増えたり複雑なクエリが必要になったら再検討する。

## 影響

- `wrangler.jsonc` に `assets` バインディングと D1 バインディングを書く
- パスワードは `wrangler secret` で管理する。Phase 5 まではローカルの `.dev.vars` で足りる
- `@cloudflare/vite-plugin` と `wrangler.jsonc` の設定キーは変化が速い領域なので、
  セットアップ時に公式ドキュメントで確認する。記憶で書かない
- Phase 5 に入るまで Cloudflare アカウントは不要

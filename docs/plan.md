# 実装計画

**何を、どの順で作るか**を管理する。作業を終えたらチェックを入れる。

「どう作るか」の詳細はこの文書には書かない。design 配下を正とする。

- データモデル → [design/data-model.md](design/data-model.md)
- レイアウトエンジン → [design/layout-engine.md](design/layout-engine.md)
- デザインシステム → [design/design-system.md](design/design-system.md)
- 用語 → [design/glossary.md](design/glossary.md)
- 設計判断の経緯 → [adr/](adr/README.md)

## 何を作るか

役所で調べた戸籍情報をもとにした家系図を、手入力で登録・管理し、一般公開できるウェブアプリ。
和風のビジュアル（縦書きの人名・和紙風の地色・明朝体）で描画することが特徴。

- 閲覧は誰でも可。編集は管理者1名のみ（パスワード認証）
- 人数は〜50人程度。表示情報は氏名と続柄のみ
- 養子縁組・再婚・片親のみ判明、に対応する
- 世代は上から下へ進む。人名は縦書き
- Cloudflare の無料枠で運用する

## 技術選定

| 領域 | 選定 | 補足 |
|---|---|---|
| ビルド | Vite + `@cloudflare/vite-plugin` | HMR を保ったまま workerd / D1 をローカル実行 |
| UI | React + TypeScript | |
| API | Hono | `hono/cookie` の署名付き Cookie を使う |
| DB | Cloudflare D1 + `wrangler d1 migrations` | |
| DB アクセス | 生 SQL | ORM は使わない → [ADR-0003](adr/0003-workers-and-local-dev.md) |
| バリデーション | Zod | API 境界とフォームで型を共有 |
| テスト | Vitest | |
| カタログ | Storybook | |
| ホスティング | Cloudflare Workers + Static Assets | Pages ではない → [ADR-0003](adr/0003-workers-and-local-dev.md) |

## ディレクトリ構成

```
keifu/
├─ wrangler.jsonc          # Workers + Static Assets + D1 binding
├─ vite.config.ts          # @cloudflare/vite-plugin
├─ migrations/             # wrangler d1 migrations
├─ worker/                 # Hono: /api/* + 静的アセット配信
├─ src/                    # design/design-system.md の層構成
├─ docs/                   # 設計ドキュメント
└─ .claude/                # スキルとルール
```

---

## Phase 0: 骨組み

- [ ] Vite + React + TypeScript のセットアップ
- [ ] `@cloudflare/vite-plugin` + `wrangler.jsonc`（設定キーは公式ドキュメントで確認する）
- [ ] Vitest のセットアップ
- [ ] **ESLint の層境界ルール** — `.claude/rules/layer-boundaries.md` の内容を機械的に強制する。
      後から入れると大量の違反が出て形骸化するので、コードを書く前に入れる
- [ ] `src/domain/models/` の型定義と Zod スキーマ
- [ ] `src/fixtures/` のサンプル家系15人 — 養子・再婚・片親・複数ルート・世代の矛盾を含める。
      レイアウトエンジンのテストと Storybook で共用する

## Phase 1: レイアウトエンジン（UI なし）

仕様は [design/layout-engine.md](design/layout-engine.md)。全工程を TDD で進める。

- [ ] 入力バリデーション（自己親子・祖先ループの検出）
- [ ] 世代割当（差分制約系 / 負閉路検出 / `generation_override`）
- [ ] 主系統の抽出
- [ ] 横位置計算（夫婦の隣接・兄弟の連続・複数ルート）
- [ ] 結線パス生成
- [ ] 座標変換（orientation adapter、上→下）
- [ ] 続柄の導出 `src/domain/kinship/`
- [ ] layout-engine.md のテスト観点を全て通す

**この時点で画面は何も無い。最大の不確実性を先に解消するのが狙い。**

## Phase 2: 家系図の描画

仕様は [design/design-system.md](design/design-system.md)。

- [ ] デザイントークン
- [ ] `VerticalName`（1文字ずつ `<tspan>` 配置）
- [ ] `PersonNode`
- [ ] `MarriageLink`（平行2本の path で二重線）
- [ ] `ChildLink`（実線 / 点線）
- [ ] `TreeCanvas`（ズーム・パン）
- [ ] `Legend`（トークンから自動生成）
- [ ] Storybook にバリエーションのストーリー
- [ ] 公開閲覧ページ — データは `src/fixtures/` を直読み。DB はまだ使わない

**この時点で動く家系図が見える。**

## Phase 3: 永続化

仕様は [design/data-model.md](design/data-model.md)。

- [ ] D1 スキーマとマイグレーション
- [ ] CRUD API（Hono + 生 SQL + Zod）
- [ ] アプリ側バリデーション（祖先ループ検出、削除時の参照チェック）
- [ ] **JSON エクスポート / インポート** — 手入力した資産を守る保険。ここで必ず入れる
- [ ] 閲覧ページを fixtures 直読みから API 経由に切り替え

## Phase 4: 編集機能

- [ ] パスワード認証 — ハッシュ（PBKDF2）を env に置き、定数時間比較する
- [ ] 署名付きセッション Cookie（HttpOnly / Secure / SameSite=Lax / 有効期限）
- [ ] ログイン試行のレート制限
- [ ] 書き込み API の Origin ヘッダ検証（CSRF）
- [ ] 人物の追加・編集・削除
- [ ] family の追加・削除（配偶者、婚姻順序、片親のみ）
- [ ] 子の追加・削除（実子 / 養子、所属 family の選択）
- [ ] 兄弟の並び順変更
- [ ] 編集結果の家系図プレビュー

## Phase 5: 仕上げとデプロイ

- [ ] 人名検索とハイライト
- [ ] 印刷 / PNG・PDF 書き出し
- [ ] モバイル対応（ピンチズーム）
- [ ] アクセシビリティ（SVG の `role="img"` + `aria-label`、キーボード操作）
- [ ] Cloudflare へのデプロイ、`wrangler secret` の設定
- [ ] README 整備

---

## 制約

- Cloudflare の無料枠に収める。外部の有料サービスを使わない
- パスワードをコードにハードコードしない
- **JSON エクスポートを Phase 3 で必ず実装する。**
  手入力した50人分のデータが唯一の資産であり、失うと復元不能
- Phase 5 に入るまで Cloudflare アカウントは不要。それまでは全てローカルで完結させる

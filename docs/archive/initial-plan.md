# 家系図ウェブアプリ 実装計画(Claude Code用)

## プロジェクト概要

役所で調べた戸籍情報をもとにした家系図を、手入力で登録・管理し、一般公開できるウェブアプリを作る。
伝統的な日本の家系図(縦書き・縦に下るレイアウト)を再現することが最大の特徴。

## 確定要件

### ユーザーと権限
- **閲覧**: 誰でも可(一般公開、ログイン不要)
- **編集**: 管理者1名のみ。簡易パスワード認証(環境変数にパスワードを設定し、セッションCookieで管理)
- 存命者のプライバシー配慮は不要(掲載情報が名前・続柄のみのため)

### データ規模・内容
- 人数: 〜50人程度
- 1人あたりの情報: **氏名・続柄のみのシンプル構成**(生没年などは持たない。ただしDB設計上は将来の拡張余地を残してよい)

### 関係性(重要・対応必須)
- 通常の実親子関係
- **養子縁組**(実親と養親の両方を持てること。家系図上で養子関係は実線と区別できる表現にする。例: 点線)
- **再婚**(1人が複数の配偶者を持てること。婚姻に順序を持たせる)
- 同一人物が複数の家系ラインに接続されるケースを許容するデータ構造にする

### 表示
- **縦に下る伝統的な日本の家系図レイアウト**(祖先が上、子孫が下)
- **名前は縦書き**(CSS `writing-mode: vertical-rl` を使用)。和風のデザイン(和紙風の背景、明朝体系フォントなど)
- ズーム・パン(ドラッグ移動)可能なキャンバス
- 夫婦は横並び+結線、子はその下にぶら下がる
- 養子は点線などで区別、再婚は婚姻ごとに子をグルーピング

### インフラ(無料枠で運用)
- **Cloudflare Pages** + **Pages Functions(またはWorkers)** + **D1(SQLite)**
- すべてCloudflareの無料枠内に収める(50人規模・個人利用なら余裕で収まる)
- デプロイは `wrangler` CLI を使用。ローカル開発も `wrangler dev` で行う

## 推奨技術スタック

- フロントエンド: React + Vite(または好みでSvelteKitでも可)。家系図描画はSVGで自前実装(50人規模なのでライブラリ不要。d3-hierarchyをレイアウト計算に使ってもよい)
- バックエンド: Hono(Cloudflare Workers/Pages Functionsと相性が良い)
- DB: Cloudflare D1
- 認証: パスワードを環境変数(Wrangler secrets)に保存 → 照合成功で署名付きCookieを発行

## デザインシステムとアーキテクチャ(重要方針)

**見た目とロジックを完全に分離する。画面はUIコンポーネントの組み合わせのみで構築し、ロジックを持つ層では一切スタイル調整をしない。**

### レイヤー構成

```
src/
├── design-system/        # 見た目だけの世界(ロジック禁止)
│   ├── tokens/           # デザイントークン(CSS変数 + TS定数)
│   ├── primitives/       # Button, TextField, Select, Modal, Toast,
│   │                     #   VerticalText(縦書き), Card, Divider など
│   ├── layouts/          # 画面レイアウトパターン
│   │                     #   PageShell / AdminShell / Stack / Cluster /
│   │                     #   Toolbar / SidePanel / FullscreenCanvas
│   └── tree/             # 家系図専用の描画コンポーネント(純粋表示)
│                         #   PersonNode, MarriageLink, ChildLink(実線/点線),
│                         #   GenerationRow, TreeCanvas(ズーム・パンUI)
├── domain/               # ロジックだけの世界(JSX・スタイル禁止)
│   ├── layout-engine/    # 家系図レイアウト計算(純粋関数: データ→座標)
│   └── models/           # 型定義・バリデーション
├── features/             # 接続層(hooks + コンテナ)
│   ├── tree-view/        # useTree() → design-system/tree に座標を渡すだけ
│   └── admin/            # usePersons(), useMarriages() 等のCRUDフック
└── pages/                # ルーティング。features を並べるだけ
```

### 厳守ルール

1. **design-system/ 配下はpropsのみで完結**。API呼び出し・グローバル状態・ドメイン知識を持たない。`onClick` 等はコールバックとして受け取るだけ
2. **features/・domain/ 配下では className / style / CSS を書かない**。見た目の調整が必要になったら design-system 側のコンポーネントやvariant propを追加する
3. **色・余白・フォントサイズ・線種のマジックナンバー禁止**。すべてトークン経由(`var(--color-ink)` 等)
4. **家系図レイアウト計算は純粋関数**(`domain/layout-engine`)。入力=人物・婚姻・親子関係、出力=ノード座標と結線パスの配列。描画コンポーネントはその結果を受け取って描くだけ。単体テストを書くこと
5. ページ全体の構造(ヘッダー・余白・グリッド)も layouts/ のレイアウトコンポーネントで表現し、ページ側で `<div style=...>` を書かない

### デザイントークン(和風テーマ)

```css
:root {
  /* 色: 和の顔料由来で命名 */
  --color-washi: #f3ede1;      /* 背景: 生成り和紙 */
  --color-ink: #2b2722;        /* 文字・線: 墨 */
  --color-ink-soft: #6b635a;   /* 補助線・注釈 */
  --color-shu: #a63a2a;        /* アクセント: 朱(選択・当主マーク等) */
  --color-kin: #b28a4c;        /* 補助アクセント: 金茶 */

  /* タイポグラフィ */
  --font-display: "Shippori Mincho", serif;  /* 見出し・人名(縦書き) */
  --font-body: "Zen Kaku Gothic New", sans-serif; /* UI・編集画面 */

  /* 線種(家系図の意味を担う) */
  --line-blood: 1.5px solid var(--color-ink);   /* 実子 */
  --line-adopted: 1.5px dashed var(--color-ink); /* 養子 */
  --line-marriage: 3px double var(--color-ink);  /* 婚姻(二重線) */

  /* 余白スケール */
  --space-1: 4px; --space-2: 8px; --space-3: 16px;
  --space-4: 24px; --space-5: 40px; --space-6: 64px;
}
```

線種がそのまま家系図の意味(実子/養子/婚姻)を表すのがこのデザインシステムの核。凡例コンポーネント(`Legend`)もトークンから自動生成する。

### コンポーネントカタログ(Storybook)

**Storybook** を導入し、design-system配下の全コンポーネント(primitives / layouts / tree)にストーリーを作成する。

- トークン一覧(色・タイポグラフィ・線種・余白)もストーリーとして可視化する
- tree系コンポーネントは「実子/養子」「初婚/再婚」などバリエーションごとのストーリーを用意し、複雑ケースの見た目を単体で確認できるようにする
- design-systemのコンポーネントは props のみで動くため、モックデータだけでストーリーが書ける状態を維持すること(ストーリーが書きにくい=分離が崩れているサイン)
- Storybookはローカル開発用。本番デプロイには含めない(必要になったらCloudflare Pagesの別プロジェクトとして無料で公開可能)

## データモデル案

```sql
-- 人物
CREATE TABLE persons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_name TEXT NOT NULL,      -- 姓
  given_name TEXT NOT NULL,       -- 名
  sex TEXT,                        -- 表示上の配置に使う場合のみ(任意)
  note TEXT,                       -- 続柄メモ等(任意)
  sort_order INTEGER DEFAULT 0,   -- 兄弟の並び順
  created_at TEXT DEFAULT (datetime('now'))
);

-- 婚姻(再婚対応: 同一人物が複数行持てる)
CREATE TABLE marriages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner1_id INTEGER NOT NULL REFERENCES persons(id),
  partner2_id INTEGER NOT NULL REFERENCES persons(id),
  marriage_order INTEGER DEFAULT 1,  -- 何度目の婚姻か
  note TEXT
);

-- 親子関係(養子対応: relation_typeで区別)
CREATE TABLE parent_child (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES persons(id),
  child_id INTEGER NOT NULL REFERENCES persons(id),
  relation_type TEXT NOT NULL DEFAULT 'biological',  -- 'biological' | 'adopted'
  marriage_id INTEGER REFERENCES marriages(id)       -- どの婚姻から生まれた子か(再婚時の子のグルーピングに使用)
);
```

ポイント:
- 養子は「実親とのparent_child(biological)」と「養親とのparent_child(adopted)」を両方持てる
- 再婚の子は `marriage_id` でどの婚姻の子か紐づける

## 画面構成

1. **公開閲覧ページ(`/`)**
   - 家系図をSVGで全画面表示。ズーム・パン対応
   - 人物をタップ/クリックすると氏名・続柄メモをポップアップ表示
2. **ログインページ(`/admin/login`)**
   - パスワード入力のみ
3. **編集ページ(`/admin`)** ※要ログイン
   - 人物の追加・編集・削除
   - 婚姻の追加・削除(再婚順序の指定)
   - 親子関係の追加・削除(実子/養子の選択、紐づく婚姻の選択)
   - 兄弟の並び順変更
   - 編集結果を家系図プレビューで即確認できると望ましい

## 家系図レイアウトの実装方針

- 世代ごとに段を分け、上から下へ配置(祖先が最上段)
- 夫婦ノードを1ユニットとして横並びに配置し、二重線または横線で結ぶ
- 子ユニットは親婚姻の下に配置し、縦線+横線(兄弟をまとめる横バー)で接続
- 養子への線は点線で描画
- 再婚がある場合、配偶者を婚姻順に横に並べ、それぞれの婚姻の下に子をぶら下げる
- 名前ラベルは `writing-mode: vertical-rl` の縦書き。フォントは「Noto Serif JP」等の明朝体
- 背景は和紙風のテクスチャまたは生成り色(#f5f0e6系)で和風に

## 実装フェーズ(この順で進めること)

### Phase 1: 基盤 + デザインシステム
- プロジェクトセットアップ(Vite + React + Hono + wrangler設定)
- **デザイントークンとprimitives・layoutsの実装、Storybookセットアップ+各ストーリー作成**
- D1スキーマ作成・マイグレーション
- 人物・婚姻・親子関係のCRUD API

### Phase 2: レイアウトエンジン(ロジック層)
- `domain/layout-engine` の純粋関数実装(世代割当 → 横位置計算 → 結線パス生成)
- 養子・再婚を含むテストデータでの単体テスト(この時点ではUIなしで検証)

### Phase 3: 家系図描画(表示層)
- `design-system/tree` の描画コンポーネント(PersonNode, MarriageLink, ChildLink, TreeCanvas)
- レイアウトエンジンの出力を接続して公開閲覧ページを完成
- 縦書きラベル、和風スタイリング、ズーム・パン

### Phase 4: 編集機能
- パスワードログイン(セッションCookie)
- 編集画面(人物/婚姻/親子関係の登録UI)。既存のprimitives/layoutsのみで構築すること

### Phase 5: 仕上げ
- 養子(点線)・再婚(婚姻ごとの子グループ)の表示確認
- スマホ表示対応(閲覧はモバイル比重が高い想定)
- Cloudflare Pagesへのデプロイ手順の整備(READMEに記載)

## 制約・注意事項

- Cloudflare無料枠内に収めること(外部有料サービスを使わない)
- 人物データにはテストデータ(養子・再婚を含む15人程度のサンプル家系)を用意し、複雑ケースの表示を検証すること
- パスワードはコードにハードコードせず `wrangler secret` で管理すること

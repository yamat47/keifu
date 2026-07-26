# デザインシステム

見た目に関する規約の**正**。実装は `src/design-system/`。

層の境界を守るための機械的なチェックは [.claude/rules/layer-boundaries.md](../../.claude/rules/layer-boundaries.md) にある。

## 層構成

```
src/
├── design-system/        # 見た目だけの世界
│   ├── tokens/           # デザイントークン（CSS変数 + TS定数）
│   ├── primitives/       # Button, TextField, Select, Modal, Toast, Card, Divider
│   ├── layouts/          # PageShell / AdminShell / Stack / Cluster /
│   │                     #   Toolbar / SidePanel / FullscreenCanvas
│   └── tree/             # 家系図の描画コンポーネント
│                         #   PersonNode, VerticalName, MarriageLink,
│                         #   ChildLink, TreeCanvas, Legend
├── domain/               # ロジックだけの世界（.ts のみ）
│   ├── layout-engine/
│   ├── kinship/
│   └── models/
├── features/             # 接続層（hooks + コンテナ）
├── fixtures/             # サンプル家系（テストと Storybook で共用）
└── pages/                # ルーティング
```

## 層のルール

1. **`design-system/` は props のみで完結する。**
   API 呼び出し・グローバル状態・ドメイン知識を持たない。
2. **`design-system/` は UI 状態を持ってよい。**
   ズーム量・パン位置・開閉・ホバーなど、見た目に閉じた状態は内部に持つ。
   禁止するのは**ドメイン状態と副作用**（fetch・ストア・ルーティング）。
3. **`features/` `pages/` `domain/` で `className` / `style` / CSS を書かない。**
   調整が必要なら design-system 側に variant prop を足す。
4. **色・余白・フォントサイズ・線種のマジックナンバー禁止。** すべてトークン経由。
5. **`domain/` は他の層を import しない。** 拡張子は `.ts` のみ（`.tsx` 禁止）。

ルール2 を明示している理由は、「design-system はロジック禁止」を額面通り取ると
ズーム・パンを持つ `TreeCanvas` が作れなくなるため。禁止する対象は副作用であって状態ではない。

## デザイントークン

```css
:root {
  /* 色: 和の顔料由来で命名 */
  --color-washi:    #f3ede1;  /* 背景: 生成り和紙 */
  --color-ink:      #2b2722;  /* 文字・線: 墨 */
  --color-ink-soft: #6b635a;  /* 補助線・注釈 */
  --color-shu:      #a63a2a;  /* アクセント: 朱（選択・当主マーク） */
  --color-kin:      #b28a4c;  /* 補助アクセント: 金茶 */

  /* タイポグラフィ */
  --font-display: "Shippori Mincho", serif;          /* 人名（縦書き） */
  --font-body:    "Zen Kaku Gothic New", sans-serif; /* UI・編集画面 */

  /* 線: SVG のプレゼンテーション属性に対応させる */
  --stroke-color-relation: var(--color-ink);
  --stroke-width-relation: 1.5;
  --dash-biological: none;     /* 実子: 実線 */
  --dash-adopted:    5 4;      /* 養子: 点線 */
  --marriage-gap:    3;        /* 婚姻: 平行な2本の path の間隔 */

  /* 余白スケール */
  --space-1: 4px;  --space-2: 8px;  --space-3: 16px;
  --space-4: 24px; --space-5: 40px; --space-6: 64px;
}
```

### 値は CSS が持ち、TS は名前だけを持つ

実装は `src/design-system/tokens/` の2ファイルに分かれる。

- `tokens.css` — 上の `:root` そのもの。**値を書いてよいのはここだけ**
- `tokens.ts` — `tokens.color.ink === 'var(--color-ink)'` のように参照だけを持つ。
  コンポーネントは色・線種・余白をこれ経由で指定する

TS 側にも値を書くと、どちらかが必ず古くなる。定義と参照に過不足が無いことは
`tokens.test.ts` が両方向で突き合わせる。定義の無い `var()` は無言で効かないので、
目視では気づけない。

`tokens/index.ts` が `tokens.css` を import する。トークンを使えば定義が必ず載る形にして、
エントリが増えるたびに読み込みを書き足さなくて済むようにしている。

### 書体は自前で配信する

`--font-display` / `--font-body` は書体の**名前**しか持たない。実体は
[`@fontsource`](https://fontsource.org/) の npm パッケージから読み込む。
Google Fonts の CDN は使わない → [ADR-0008](../adr/0008-self-hosted-sliced-web-fonts.md)

- 読み込むのは `unicode-range` で分割された CSS（`@fontsource/<font>/400.css`）。
  ページに出た文字を含む断片だけがダウンロードされる
- ウェイトは 400 だけ。トークンにウェイトの軸が無いので、他を読んでも使えない
- 読み込みは `tokens/index.ts` が随伴させる。`tokens.css` と同じ理由で、
  トークンを使えば書体が必ず載る形にする

**書体の読み込みを Vite のプラグインや `index.html` の `<link>` でやらない。**
design-system の import に相乗りさせておけば、`pnpm dev` と Storybook の
どちらにも同じものが載る。Storybook は直下の `vite.config.ts` を読まないので、
プラグインや HTML に置くと片方だけ書体が違う状態になる（後述「Storybook」）。

トークンが名指す書体名と、読み込んだ `@font-face` の `font-family` が
一致していることは `fonts.test.ts` が両方向で突き合わせる。
綴りがずれても画面はフォールバックの serif / sans-serif で普通に出るので、
目視では気づけない。

### ノードの寸法

**`PersonNode` は `SIBLING_PITCH` / `GENERATION_PITCH` を超えて広がらない。**
ピッチはレイアウトエンジンが持つ配置のパラメータで、トークンではない
（[layout-engine.md](layout-engine.md)「5. 座標変換」）。

レイアウトエンジンはノードを点としてしか扱えず、重ならないことを
ピッチとの比較でしか検証できない（同「テスト観点」観点9）。
ノードがピッチを超えると、エンジンのテストが緑のままノードが重なる。
人名が長くて収まらない場合は、はみ出させるのではなく文字を詰める。

### 線トークンが CSS の `border` 記法ではない理由

家系図は SVG で描く。SVG の線は `stroke` / `stroke-width` / `stroke-dasharray` であり、
`1.5px solid var(--color-ink)` のような `border` shorthand は一切解釈されない。

`stroke` / `stroke-width` / `stroke-dasharray` は CSS プロパティなので `var()` は効く。
ただし **SVG に `border: double` に相当するものは無い**ため、
婚姻の二重線は `MarriageLink` が平行な2本の path を描くことで表現する。

線種がそのまま家系図の意味（実子 / 養子 / 婚姻）を表すのがこのデザインシステムの核。
凡例コンポーネント `Legend` はトークンから自動生成し、手書きの対応表を作らない。

## 縦書きテキスト

人名の縦書きは `VerticalName` コンポーネントが担当し、
**1文字ずつ `<tspan x dy>` で配置する**。

`writing-mode: vertical-rl` を SVG `<text>` に適用する方法は採らない。
ブラウザ差が出やすく、行間や約物の制御が効かないため。
`<foreignObject>` に HTML を埋める方法も採らない。Safari で崩れやすく、
印刷や PNG 書き出しで壊れるため。

人名は2〜6文字なので、文字単位の配置は現実的なコストで済む。

## Storybook

`design-system/` 配下のコンポーネントにストーリーを作る。
**全コンポーネントを先に作るのではなく、必要になったものから追加する。**

- トークン一覧（色・タイポグラフィ・線種・余白）を可視化するストーリーを置く
- `tree/` は「実子 / 養子」「初婚 / 再婚」などバリエーションごとのストーリーを用意する
- `src/fixtures/` のサンプル家系をテストと共用する
- **モックデータだけでストーリーが書ける状態を維持する。**
  ストーリーが書きにくくなったら、それは層の分離が崩れたサイン
- ローカル開発用。本番デプロイには含めない

### Storybook は直下の Vite 設定を読まない

`.storybook/vite.config.ts` を持ち、`viteConfigPath` でそれを読ませている。
直下の `vite.config.ts` を読ませると `@cloudflare/vite-plugin` が Storybook に入り、
`wrangler.jsonc` の内容で壊れる余地ができる → [ADR-0007](../adr/0007-storybook-has-its-own-vite-config.md)

**直下の `vite.config.ts` に足したプラグインは Storybook に効かない。**
SVG のインライン化やフォントの処理を入れるときは両方に書く。

ストーリーは `design-system/` 配下だけに置く。`features/` や `pages/` に
ストーリーが生えたら、それは見た目が接続層に漏れたサイン。

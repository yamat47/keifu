# ADR-0008: 書体は分割された自前配信のものを読む

- Status: Accepted
- Date: 2026-07-27

## 状況

[design-system.md](../design/design-system.md) は書体を2つ定めている。

- `--font-display`: `"Shippori Mincho", serif` — 人名（縦書き）
- `--font-body`: `"Zen Kaku Gothic New", sans-serif` — UI・編集画面

ところが**トークンは名前しか持っておらず、実体がどこにも読み込まれていなかった**。
`@font-face` が無いので、どちらもシステムの serif / sans-serif に落ちていた。
それでも画面は普通に出る。和風のビジュアルが特徴だと言いながら、
明朝体でない明朝体トークンを持っていた状態。

日本語の書体は英字のそれと桁が違う。Shippori Mincho の
ウェイト400・日本語一括の woff2 は 1.35 MB、Zen Kaku Gothic New は 0.97 MB。
読み込み方の選択がそのまま初回表示のコストになる。

## 決定

**`@fontsource` の npm パッケージを依存に入れ、`unicode-range` で分割された
CSS（`@fontsource/<font>/400.css`）を design-system の import から読む。**

```ts
// src/design-system/tokens/index.ts
import './fonts.css'
import './tokens.css'
```

`fonts.css` が `@fontsource/shippori-mincho/400.css` と
`@fontsource/zen-kaku-gothic-new/400.css` を `@import` する。
読むのはウェイト 400 だけ。

## 理由

**CDN を使わない。**
このアプリは一般公開する家系図で、閲覧者に第三者ドメインへの接続を
発生させる理由が無い。CLAUDE.md が Phase 5 までローカルで完結させると
決めているのもあり、`pnpm dev` がネットワークなしで同じ見た目になるほうが良い。
Phase 5 の PNG / PDF 書き出しでも、書体が同一オリジンにあるほうが埋め込みやすい。

**日本語一括ではなく分割版を読む。** 理由は2つある。

1. **初回のダウンロード量。** 分割版は Google Fonts が配信しているものと同じ形で、
   1書体あたり約120個の断片に割れている（1個 10〜60 KB）。ブラウザは
   `unicode-range` を見て、そのページに出た文字を含む断片だけを取る。
   50人程度の家系図なら数個で足りる。一括版は 1.35 MB を必ず全部取る
2. **字の網羅。** 一括版の `japanese` は常用漢字寄りの部分集合で、
   分割版は書体の全字種を覆う。このアプリの入力元は戸籍で、
   旧字体・異体字（齋・邊・濱など）が普通に出てくる。
   欠けた字はその1文字だけフォールバックの書体で描かれ、並べたときに浮く

**読み込みをトークンの import に相乗りさせる。**
`tokens/index.ts` が `tokens.css` を随伴させているのと同じ理由
→ [design-system.md](../design/design-system.md)「値は CSS が持ち、TS は名前だけを持つ」。
書体もトークンの一部なので、トークンを使ったら必ず載る形にしておく。
エントリが増えるたびに読み込みを書き足す形にすると、必ず書き忘れる。

## 採用しなかった案

**Google Fonts の CDN を `<link>` で読む**

一番短く書ける。断片化も Google 側がやってくれる。採らなかったのは、
閲覧者の接続先が増えることと、`index.html` に置いたものが
**Storybook には効かない**ため。Storybook は直下の `vite.config.ts` も
`index.html` も読まない → [ADR-0007](0007-storybook-has-its-own-vite-config.md)。
カタログとアプリで書体が違う状態は、まさに Storybook が防ぐべきもの。

**ビルド時に使う字だけへサブセットする**

50人分の人名なら数百字で、数十 KB に収まる。理屈では最も小さい。
採らなかったのは、**必要な字が実行時のデータで決まる**ため。
人物を1人追加した瞬間に、ビルド済みのサブセットに無い字が出る。
DB を読んでビルドし直す仕組みは、Phase 3 すら始まっていない今の段階で
持ち込む複雑さに見合わない。

**`japanese-400.css`（日本語一括）を読む**

`@font-face` が1書体1個で済み、ファイル数も2個で終わる。
Phase 5 で SVG に書体を埋め込むときも、断片120個より扱いやすい。
採らなかったのは上の「理由」の通り、初回 2.3 MB と字の網羅の2点で負けるため。
埋め込みが本当に必要になったら、そのときは使う字が確定しているので
サブセットを作る方が筋が良い。

## 影響

- **`dist/` が 12 MB になる。** `pnpm build` で実際に測った内訳は
  woff2 が228個で 5.3 MB、**woff が230個で 6.3 MB**。
  `@fontsource` の `@font-face` は `src` に woff2 と woff を並べて書いてあり、
  Vite は静的に参照されている `url()` を両方とも出力する。
  woff を取るブラウザはもう無いので、この 6.3 MB は配信側の置き場だけの無駄。
  woff2 だけを読む CSS はパッケージが export していないので、剥がすなら
  `@font-face` を自前で書き直すことになる。Cloudflare Static Assets の上限は
  20,000 ファイル / 1ファイル 25 MiB なので、収まる分には収まっている
- **CSS バンドルが 272 KB（gzip 120 KB）になる。** `unicode-range` の羅列の分で、
  JS バンドル（gzip 60 KB）より大きい。**圧縮してもこれだけ残る。**
  それでも一括版の 2.3 MB より1桁小さく、断片は数個で足りるので判断は変わらない
- **ウェイトを増やすときは 400 と同じ判断が要る。** 太字が欲しくなったら、
  トークンにウェイトの軸を足すところから始める。
  `<strong>` に任せて合成太字で済ませられるなら、そのほうが軽い
- 書体名の綴りがずれても画面は出てしまうので、`fonts.test.ts` が
  トークンと `@font-face` を両方向で突き合わせる

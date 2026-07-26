# ADR-0007: Storybook は専用の Vite 設定を持つ

- Status: Accepted
- Date: 2026-07-27

## 状況

Phase 2 の描画コンポーネントに入る前に Storybook を導入した。
`.claude/rules/tdd.md` が `src/design-system/**` の検証手段を
「Storybook のストーリーを先に書く」と定めているので、
最初の描画コンポーネントより先に置く必要があった。

`@storybook/builder-vite` は既定でリポジトリ直下の `vite.config.ts` を読む。
このプロジェクトの `vite.config.ts` は `@cloudflare/vite-plugin` を持っている
→ [ADR-0003](0003-workers-and-local-dev.md)

導入直後に、Storybook が解決した Vite 設定のプラグイン一覧を実際に出して確認した。
`vite-plugin-cloudflare` から始まる**16個のプラグインが Storybook 側に入っていた**。
その時点では画面は正常に出ており、workerd も起動していなかった。

## 決定

**`.storybook/vite.config.ts` を置き、`viteConfigPath` でそれを読ませる。**

```ts
framework: {
  name: '@storybook/react-vite',
  options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
}
```

この設定は `@vitejs/plugin-react` だけを持つ。Cloudflare のプラグインも
`wrangler.jsonc` への依存も持たない。

## 理由

**壊れていないから放置してよい種類の同居ではない。**
`@cloudflare/vite-plugin` は `wrangler.jsonc` を読み、Worker 用の environment を定義し、
条件が揃えば workerd を起動する。Storybook が映すのは
`design-system/` の props だけで完結する世界で、Worker も D1 も要らない
→ [design-system.md](../design/design-system.md)「層のルール」

同居させると、`wrangler.jsonc` を触ったとき、あるいはプラグインを上げたときに
**Storybook が壊れる余地が残る**。そのとき「なぜコンポーネントカタログが
Cloudflare の設定で壊れるのか」から調べ始めることになる。
CLAUDE.md が「`@cloudflare/vite-plugin` と `wrangler.jsonc` の設定キーは変化が速い」と
書いているのは、まさにこの手の破損を想定している。

`vitest.config.ts` を `vite.config.ts` と分けているのも同じ理由で、
このリポジトリには既に前例がある。

## 採用しなかった案

**`viteFinal` で `vite-plugin-cloudflare` をプラグイン名で除外する**

設定ファイルが1つで済む点は魅力的だった。採らなかったのは、
名前で照合するフィルタは**外し損ねたときに黙って通る**ため。
プラグイン名が変わっても、増えても、lint もテストも落ちない。
上で数えた16個は全て `vite-plugin-cloudflare` で始まっていたが、
その前提が今後も続く保証はどこにもない。

**直下の `vite.config.ts` から `cloudflare()` を外し、Worker 用の設定を別に切る**

「アプリの Vite 設定」と「Worker の Vite 設定」を分ける形のほうが筋は通る。
採らなかったのは、`pnpm dev` が HMR を保ったまま workerd と D1 を動かすことが
ADR-0003 の中心にある決定で、そこを触るのは Storybook 導入の範囲を超えるため。
Phase 3 で D1 を使い始めてから、必要なら改めて考える。

## 影響

- **`.storybook/vite.config.ts` の `react()` は省略できない。**
  `@storybook/react-vite` の `viteFinal` が足すのは docgen のプラグインだけで、
  `@vitejs/plugin-react` 自体は含まれない（`preset.js` を読んで確認した）。
  省くと JSX は変換されるが Fast Refresh が死ぬ。落ちないので気づきにくい
- **直下の `vite.config.ts` に足したプラグインは Storybook に効かない。**
  SVG のインライン化やフォントの処理を入れるときは両方に書く。
  何も失敗しないまま Storybook だけ挙動が違う状態になりうる
- CI は `test` / `lint` / `typecheck` の3つで、Storybook をビルドしない。
  この設定が壊れたことは `pnpm storybook` を動かすまで分からない

# ADR-0004: fixtures を全層から import できる葉として扱う

- Status: Accepted
- Date: 2026-07-26

## 状況

`src/fixtures/` のサンプル家系は、複数の層から読まれることが最初から前提になっている。

- [layout-engine.md](../design/layout-engine.md) — テスト観点を `src/domain/` のテストで通す
- [design-system.md](../design/design-system.md) — Storybook のストーリーで共用する
- [plan.md](../plan.md) Phase 2 — 公開閲覧ページが直読みする（Phase 3 で API 経由に切り替える）

一方 [layer-boundaries.md](../../.claude/rules/layer-boundaries.md) は
「fixtures が何を import してよいか」だけを定めていて、
**「誰が fixtures を import してよいか」を定めていなかった。**

Phase 0 で入れた ESLint の層境界ルールはこの空白を「誰も import できない」と解釈しており、
上の3つの用途すべてが lint エラーになる状態だった。
Phase 1 の最初のタスクであるレイアウトエンジンのテストで即座に詰まる。

## 決定

**`src/fixtures/` はどの層からも import してよい。**

fixtures 自身が `domain/models` しか import できない制約はそのまま維持する。

## 理由

fixtures は依存グラフの**葉**である。`domain/models`（型のみ）しか import しないため、
どの層から読まれても循環も依存の逆流も起こらない。
層境界が防ぎたいのは依存の向きが壊れることであって、
葉を共有すること自体は壊していない。

そもそも fixtures の存在理由が「層をまたいで同じデータを使う」ことにある。
レイアウトエンジンのテストと Storybook が同じ家系を指していることは、
計算結果と描画結果を突き合わせるための前提になっている。
そこを禁止すると、層ごとにサンプルデータを複製することになり、
「同じ家系のはずが微妙に違う」という最も避けたい状態を招く。

## 採用しなかった案

**テストとストーリーのファイルからのみ import を許す**
（`*.test.ts` / `*.stories.tsx` だけを例外にする）

層の分離としてはこちらが厳密で、本番のバンドルにサンプルデータが入る余地も無くなる。
採らなかったのは、plan.md Phase 2 が「公開閲覧ページはまず fixtures を直読みし、
Phase 3 で API に切り替える」という順序を意図的に選んでいるため。
この案はその段取りを禁止してしまう。

DB が無いうちに描画を完成させるという Phase 2 の狙いのほうが、
一時的にページがサンプルデータを読むことの不利益より大きい。

**fixtures を `domain/` の下に移す**

domain の中に置けば domain からは読めるようになるが、
design-system からは相変わらず読めない（design-system は domain を import できない）。
問題が半分しか解決しない上に、fixtures が domain の一部であるかのように見えてしまう。

## 影響

- 本番のバンドルにサンプル家系が入りうる。これを閉じるのは lint ではなく
  plan.md Phase 3 の「閲覧ページを fixtures 直読みから API 経由に切り替え」
- `fixtures/` に置くものは「どの層から読まれても構わないデータ」に限る。
  ロジックを置きたくなったら、それは `domain/` に属する

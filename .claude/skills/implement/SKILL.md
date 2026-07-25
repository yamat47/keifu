---
name: implement
description: keifu の実装タスクを TDD で進める。docs/plan.md の未完了タスクから対象を決め、設計ドキュメントを読み、Red-Green-Refactor で実装してコミットまで持っていく。
argument-hint: [フェーズ番号 or タスク名。省略時は次の未完了タスク]
disable-model-invocation: true
allowed-tools: Bash(pnpm:*), Bash(npx:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git switch:*)
---

# 実装タスクを進める

対象: $ARGUMENTS

引数が空なら `docs/plan.md` の**最初の未完了タスク**を対象にする。
フェーズは飛ばさない。Phase N のタスクが残っているうちは Phase N+1 に進まない。

## 0. 対象を確定する

1. `docs/plan.md` を読み、対象タスクとその Phase を確認する
2. 現在のブランチを確認する。`main` にいるなら作業ブランチを切る
   （例: `git switch -c phase1/generation-assignment`）
3. **対象タスクをこの応答の冒頭に明示する。** 何をやろうとしているか user が見て分かる状態にする

対象が曖昧、あるいは1回の作業として大きすぎると判断したら、
実装に入る前に分割案を提示して user に確認する。

## 1. 設計ドキュメントを読む — 省略しない

対象タスクに対応する design ドキュメントを**実装を書く前に必ず読む**。

| 対象 | 読むもの |
|---|---|
| `src/domain/layout-engine/`, `src/domain/kinship/` | [docs/design/layout-engine.md](../../../docs/design/layout-engine.md) |
| `src/domain/models/`, `migrations/`, `worker/` | [docs/design/data-model.md](../../../docs/design/data-model.md) |
| `src/design-system/` | [docs/design/design-system.md](../../../docs/design/design-system.md) |
| 命名で迷ったとき | [docs/design/glossary.md](../../../docs/design/glossary.md) |
| 「なぜこの設計？」と思ったとき | [docs/adr/](../../../docs/adr/README.md) |

**設計ドキュメントとコードが食い違う実装をしそうになったら、そこで止まる。**
勝手にドキュメントと違う実装をしない。次のどちらかを選ぶ。

- ドキュメントが正しい → 実装をドキュメントに合わせる
- 実装しようとしている方が正しい → **先にドキュメントを直す。** そのうえで実装する。
  複数の選択肢を比べた結果なら `/adr` で判断を記録する

ドキュメントの修正と実装は別のコミットに分ける。

## 2. TODO リストを作る

実装に入る前に、テスト観点のリストを書き出して user に見せる。
これが無いと「次に何を書くか」で迷い、テストの粒度がぶれる。

`docs/design/layout-engine.md` の「テスト観点」のように、
設計ドキュメントに観点が書いてある場合はそれを起点にする。

## 3. Red → Green → Refactor

TODO リストの項目を1つずつ、以下のサイクルで潰す。原則は `.claude/rules/tdd.md`。

1. **Red** — 失敗するテストを1つ書く。テスト名は仕様を表す日本語
2. **失敗を確認する** — `pnpm test` を実行し、**期待した理由で**落ちることを見る。
   ここを飛ばさない。落ちるところを見ていないテストは何も検証していない可能性がある
3. **Green** — 最速で通す。仮実装 / 三角測量 / 明白な実装 から選ぶ。汚くてよい
4. **Refactor** — テストが緑のまま設計を整える。テストコードも同じように整える

層ごとの適用は `.claude/rules/tdd.md` の表に従う。
`src/domain/**` と `worker/**` は例外なく TDD。
`src/design-system/**` は Storybook のストーリーが Red の代わりになる。

### 途中で気づいたことの扱い

- **仕様の抜けに気づいた** → TODO リストに足す。その場で実装に飛ばない
- **設計判断が必要になった** → 1 に戻る。ドキュメントを直してから進む
- **今のタスクと関係ない問題を見つけた** → メモして user に伝える。今のコミットに混ぜない

## 4. 完了を確認する

以下が全て通ってからコミットに進む。

```bash
pnpm test        # 全テストが緑
pnpm lint        # 層境界ルールを含む。無効化して回避しない
pnpm typecheck   # 型エラーなし
```

lint が層境界で落ちたら、それは設計が間違っているというシグナル。
`eslint-disable` で黙らせず、`.claude/rules/layer-boundaries.md` の「詰まったときの対処」を見る。

（Phase 0 が終わるまでこれらのスクリプトは存在しない。その場合は該当分を飛ばす）

## 5. 記録を残す

1. `docs/plan.md` の対象タスクにチェックを入れる
2. 設計判断をしたなら `/adr` で記録する
3. `/commit` でコミットする。**コミットログには Why を書く**

## 6. 次に進む

TODO リストに残りがあれば 3 に戻る。
Phase の全タスクが終わったら、`/pr` で PR を作るか user に確認する。

---

## このスキルが守らせたいこと

- **設計ドキュメントを読まずにコードを書かない。** ドキュメントが正で、コードが従う
- **失敗を見ていないテストを信じない**
- **今のタスクと関係ない変更を混ぜない。** 1コミット1関心事
- **判断したら記録する。** なぜそうしたかは、書かなければ必ず失われる

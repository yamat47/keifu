---
name: commit
description: 変更を意味のある単位に分割し、なぜその変更を入れたか（Why）を本文に書いてコミットする。「コミットして」「これをコミット」と言われたとき、および実装が一区切りついたときに使う。
argument-hint: [コミット対象の補足。省略可]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git branch:*), Bash(git switch:*)
---

# コミットする

補足: $ARGUMENTS

## 原則

> コードには How、テストコードには What、**コミットログには Why**、コードコメントには Why not を書こう
> — [Takuto Wada](https://x.com/t_wada/status/904916106153828352)

**何をしたか (What) と どうやったか (How) は diff を見れば分かる。**
コミットログにしか残せないのは「なぜそれをしたか」だけ。そこに紙面を使う。

## 手順

### 1. 変更を確認する

```bash
git status
git diff
git log --oneline -10
```

`main` にいる場合は作業ブランチを切ってからコミットする。

### 2. 意味のある単位に分割する

**1コミット1関心事。** 以下は必ず別のコミットに分ける。

- 設計ドキュメントの変更 と 実装
- リファクタリング と 振る舞いの変更
- テストの追加 と プロダクトコードの修正（TDD のサイクル1周分は1コミットでよい）
- 別々の TODO 項目

「あとで戻したくなったときに、この単位で戻せるか」で判断する。

必要なら `git add -p` で hunk 単位に分ける。

### 3. メッセージを書く

```
<要約。50字以内。何をしたか>

<なぜこの変更が必要だったか。背景と問題>
<複数の選択肢を比べたなら、採用しなかった案とその理由>

Refs: docs/adr/NNNN-....md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

- **日本語で書く。** ドメイン用語（続柄・養子縁組・家族ユニット）を英訳すると意味が落ちる
- 識別子は `docs/design/glossary.md` の綴りに揃える
- 本文は必須。**ただし要約だけで Why が自明な変更は1行でよい**
  （タイポ修正、依存の追加、生成ファイルの更新 など）
- 関連する ADR があれば `Refs:` でリンクする

### 4. コミットする

コミット後、`git log -1` で意図通りのメッセージになっているか確認する。

## 例

**良い例 — Why が書かれている**

```
兄弟順を persons から family_children に移す

兄弟の並び順は「その親グループの中での順序」であって人物のグローバル
属性ではない。養子は実親 family と養親 family の両方に属し、それぞれで
異なる順序を取りうるため、persons 側に1つ持つと必ず破綻する。

Refs: docs/adr/0001-family-unit-data-model.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

```
世代割当の矛盾で例外を投げず diagnostics に積むよう変更

叔父と姪の婚姻など、戸籍では実在するデータで世代制約が矛盾する。
例外を投げると家系図全体が描画できなくなり、編集作業が止まってしまう。
矛盾した婚姻制約を落として計算を続け、UI 側で警告を出す方が実用的。

Refs: docs/adr/0002-generation-assignment.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

**悪い例 — diff を読めば分かることしか書いていない**

```
family_children テーブルに sibling_order カラムを追加

family_children.sibling_order を INTEGER NOT NULL DEFAULT 0 で追加した。
あわせて persons.sort_order を削除した。
```

```
バグ修正
```

```
レイアウトエンジンを修正
```

## 意図的に決めていないこと

**Conventional Commits の prefix（`feat:` `fix:` など）を使わない。**
機械的な分類は生成できるが、Why は書こうとしなければ書かれない。
prefix を埋める作業に意識が向くと、本文が空のコミットが増える。
このプロジェクトで守りたいのは Why が残っていることであって、
自動生成された CHANGELOG ではない。

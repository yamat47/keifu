# keifu

戸籍情報をもとにした家系図を手入力で登録・管理し、一般公開するウェブアプリ。
和風のビジュアル（縦書きの人名・和紙風の地色・明朝体）で描画することが特徴。
養子縁組・再婚・片親のみ判明、に対応する。人数は〜50人規模。

Cloudflare Workers + Static Assets + D1 で運用するが、
**Phase 5 に入るまで Cloudflare アカウントは不要。全てローカルで完結させる。**

## ドキュメントの地図

**設計ドキュメントが正で、コードが従う。** 実装を書く前に該当するものを読む。

| 知りたいこと | 見る場所 |
|---|---|
| 何をどの順で作るか、今どこまで進んだか | [docs/plan.md](docs/plan.md) |
| DB スキーマ、バリデーション、続柄の導出 | [docs/design/data-model.md](docs/design/data-model.md) |
| 世代割当、横位置計算、結線、テスト観点 | [docs/design/layout-engine.md](docs/design/layout-engine.md) |
| デザイントークン、層構成、縦書きの実装 | [docs/design/design-system.md](docs/design/design-system.md) |
| 識別子の綴り、日本語との対応 | [docs/design/glossary.md](docs/design/glossary.md) |
| なぜこの設計になっているか | [docs/adr/](docs/adr/README.md) |

`docs/archive/` は初版の計画。レビュー前の内容なので参照しない。

## スキル

| コマンド | 用途 |
|---|---|
| `/implement` | `docs/plan.md` の次のタスクを TDD で実装する |
| `/commit` | 変更を意味のある単位に分割し、Why を書いてコミットする |
| `/pr` | プルリクエストを作る |
| `/adr` | 設計判断とその理由を記録する |

## 進め方の原則

このプロジェクトは t-wada の流儀に従う。

> コードには How、テストコードには What、コミットログには Why、コードコメントには Why not を書こう
> — [Takuto Wada](https://x.com/t_wada/status/904916106153828352)

- **テスト駆動開発で進める。** Red → 失敗の確認 → Green → Refactor。
  `src/domain/**` と `worker/**` は例外なく TDD → [.claude/rules/tdd.md](.claude/rules/tdd.md)
- **コミットログには Why を書く。** What と How は diff にある → `/commit`
- **コードコメントには Why not を書く。** コードを読めば分かることは書かない
  → [.claude/rules/code-comments.md](.claude/rules/code-comments.md)
- **層の境界を守る。** lint が層境界で落ちたら設計が間違っているシグナル。
  `eslint-disable` で回避しない → [.claude/rules/layer-boundaries.md](.claude/rules/layer-boundaries.md)
- **設計ドキュメントと違う実装をしそうになったら止まる。**
  先にドキュメントを直してから実装する。両者は別のコミットにする

## 言語

- ドキュメント、コミットログ、コードコメント、テスト名は**日本語**
- 識別子は英語。綴りは [docs/design/glossary.md](docs/design/glossary.md) に揃える

日本語で書く理由は、家系図のドメイン用語（続柄・養子縁組・家族ユニット）を
英語に訳すと意味が失われるため。

## コマンド

Phase 0 が完了するまで、以下のスクリプトは存在しない。

```bash
pnpm dev                                             # Vite + workerd + D1(ローカル) + HMR
pnpm test                                            # Vitest
pnpm lint                                            # ESLint（層境界ルールを含む）
pnpm typecheck                                       # tsc --noEmit
pnpm storybook                                       # コンポーネントカタログ
pnpm exec wrangler d1 migrations apply keifu --local # マイグレーション適用
```

パッケージマネージャは **pnpm**。

## 注意

- `@cloudflare/vite-plugin` と `wrangler.jsonc` の設定キーは変化が速い。
  記憶で書かず、その時点の公式ドキュメントを確認する
- パスワードをコードにハードコードしない。ローカルは `.dev.vars`、本番は `wrangler secret`
- 続柄の表記は戸籍に合わせる。「次男」ではなく**「二男」**

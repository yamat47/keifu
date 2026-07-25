---
paths:
  - "src/**"
---

# 層の境界

`src/` の各層が守る制約。設計の意図は [docs/design/design-system.md](../../docs/design/design-system.md)。

**このルールは ESLint でも強制されている。** 手で守るものではなく、
lint が落ちたら設計が間違っているというシグナルとして扱う。
lint を無効化して回避しない。

## 依存の向き

```
pages ──> features ──> domain
   │          │
   └──────────┴──> design-system ──> (何も import しない)

fixtures ──> domain/models     （fixtures はどの層からも import してよい）
```

| 層 | import してよいもの |
|---|---|
| `domain/` | **何も import しない**（外部ライブラリと `domain/` 内、および `fixtures/`） |
| `design-system/` | `design-system/` 内と `fixtures/`。`domain/` は禁止 |
| `features/` | `domain/` と `design-system/` と `fixtures/` |
| `pages/` | `features/` と `design-system/layouts` と `fixtures/` |
| `fixtures/` | `domain/models` のみ（型のため） |

**`fixtures/` はどの層からも import してよい。** → [ADR-0004](../../docs/adr/0004-fixtures-as-a-leaf.md)

fixtures は `domain/models` しか import しない葉なので、
どこから読まれても依存の向きは壊れない。むしろ層をまたいで同じサンプル家系を使うことが
存在理由で、レイアウトエンジンのテストと Storybook が同じ家系を指している必要がある。

その代わり **`fixtures/` に置いてよいのはデータだけ**。
ロジックを置きたくなったら、それは `domain/` に属する。

`design-system/` が `domain/` を import できない理由は、
描画コンポーネントがドメインの型に依存すると、Storybook でモックを作るのが
急激に難しくなるため。座標と線種だけを受け取る形を保つ。

## 書いてはいけないもの

| 層 | 禁止 |
|---|---|
| `domain/` | JSX、`.tsx` 拡張子、`className`、`style`、CSS の import、`window` / `document` |
| `design-system/` | `fetch`、グローバルストア、ルーティング、API の型 |
| `features/` `pages/` | `className`、`style` 属性、CSS の import |

`design-system/` が**持ってよい**のは UI 状態（ズーム量・パン位置・開閉・ホバー）。
禁止しているのは副作用とドメイン知識であって、状態そのものではない。

## 詰まったときの対処

**`features/` で見た目を調整したくなった**
→ `design-system/` 側のコンポーネントに variant prop を足す。
   `<div style={{ marginTop: 8 }}>` を書くのではなく `<Stack gap="2">` を使う。

**`design-system/tree` でドメインの計算をしたくなった**
→ その計算は `domain/layout-engine` に属する。座標を渡してもらう形に直す。

**`domain/` で色や線の太さを決めたくなった**
→ レイアウトエンジンが返すのは「線の種類」（`biological` / `adopted` / `marriage`）まで。
   太さと色は `design-system/tokens` が決める。

## マジックナンバー

色・余白・フォントサイズ・線の太さ・破線パターンを直接書かない。すべてトークン経由。

レイアウトの寸法（世代間の距離、兄弟間の距離）は `domain/layout-engine` の
名前付き定数として持つ。これはトークンではなく計算のパラメータなので `domain/` にあってよい。

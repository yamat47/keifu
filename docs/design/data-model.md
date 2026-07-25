# データモデル

家系図の永続化スキーマの**正**。実装とこの文書が食い違ったら、この文書を直してから実装を直す。

用語は [glossary.md](glossary.md) を参照。設計に至った経緯は [ADR-0001](../adr/0001-family-unit-data-model.md)。

## 全体像

親子関係を「(親, 子) のペア」ではなく **「家族ユニット (family)」を介して**表現する。
子は「どの family に属するか」で親を特定する。GEDCOM の FAM と同じ考え方。

```
persons ──┬─< families.partner1_id
          ├─< families.partner2_id
          └─< family_children.child_id
                     │
              families.id
```

## スキーマ

```sql
-- 人物
CREATE TABLE persons (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  family_name         TEXT NOT NULL,
  given_name          TEXT NOT NULL,
  kana                TEXT,
  sex                 TEXT CHECK (sex IN ('m','f') OR sex IS NULL),
  birth_year          INTEGER,
  death_year          INTEGER,
  note                TEXT,
  generation_override INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 家族ユニット。婚姻、または片親のみの親グループを表す
CREATE TABLE families (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  partner1_id    INTEGER REFERENCES persons(id) ON DELETE RESTRICT,
  partner2_id    INTEGER REFERENCES persons(id) ON DELETE RESTRICT,
  partner1_order INTEGER NOT NULL DEFAULT 1,
  partner2_order INTEGER NOT NULL DEFAULT 1,
  kind           TEXT NOT NULL DEFAULT 'marriage'
                 CHECK (kind IN ('marriage','unmarried')),
  note           TEXT,
  CHECK (partner1_id IS NOT NULL OR partner2_id IS NOT NULL),
  CHECK (partner1_id IS NULL OR partner2_id IS NULL OR partner1_id <> partner2_id)
);
CREATE UNIQUE INDEX ux_families_pair ON families(partner1_id, partner2_id);

-- family に属する子
CREATE TABLE family_children (
  family_id     INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id      INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'biological'
                CHECK (relation_type IN ('biological','adopted')),
  sibling_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (family_id, child_id)
);
CREATE INDEX ix_family_children_child ON family_children(child_id);
```

## 各カラムの意図

### persons

| カラム | 意図 |
|---|---|
| `kana` | 検索とソート用。家系図には表示しない |
| `sex` | 続柄の自動導出（長男 / 長女）と、夫婦の左右配置に使う。NULL 許容 |
| `birth_year` / `death_year` | **家系図には表示しない。** 同姓同名の人物を編集画面で識別するために持つ |
| `note` | 戸籍からの補足。構造で表せないもの（庶子、分家、家督相続 など） |
| `generation_override` | 世代の自動割当が矛盾した場合の手動指定。通常は NULL |

### families

| カラム | 意図 |
|---|---|
| `partner1_id` / `partner2_id` | 家系図上の**左右の配置順を兼ねる**。片方が NULL なら片親のみ |
| `partner1_order` | partner1 にとって何度目の婚姻か |
| `partner2_order` | partner2 にとって何度目の婚姻か |
| `kind` | `marriage` = 婚姻、`unmarried` = 婚姻関係にない親グループ |

再婚順序を family に1つではなく**partner ごとに2つ**持つ理由は、
「A にとって2度目の婚姻だが、相手 B にとっては初婚」が普通に起きるため。

`partner1_id` / `partner2_id` を ID 昇順に正規化してはいけない。左右の配置順という意味を持つ。

### family_children

| カラム | 意図 |
|---|---|
| `relation_type` | `biological` = 実子（実線）、`adopted` = 養子（点線） |
| `sibling_order` | **その family の中での**兄弟順。人物側ではなく family 側に持つ |

`sibling_order` を `persons` 側に持たない理由は、養子が実親 family と養親 family の
両方に属し、それぞれで異なる順序を取りうるため。

## 典型ケースの表現

### 養子縁組
実親の family に `biological` の行、養親の family に `adopted` の行の**2行**を持つ。
どちらか一方だけを持つことも許される（実親が不明な養子など）。

### 再婚
配偶者ごとに family を作る。子は生まれた婚姻の family に属するため、
再婚の子のグルーピングは構造上自動的に決まる。

### 片親のみ判明
`partner2_id` を NULL にした family を作る。

### 同一人物が複数の家系ラインに接続
`family_children` に複数行、あるいは複数 family の partner になることで表現される。
制約で禁止しない。

## アプリ側で担保するバリデーション

SQL の CHECK では表現できないため、アプリ側で検証する。
**検証する場所を、対象の広さで2つに分ける。**

### 1行で閉じるもの — Zod スキーマ（`src/domain/models/`）

1件のレコードだけを見れば判定できる。API 境界と編集フォームの両方で同じスキーマを使う。

1. **没年が生年より前でない** — どちらかが NULL なら検証しない
2. **partner が1人もいない family を作らせない**（SQL の CHECK と対）
3. **同一人物が同じ family の両方の partner にならない**（SQL の CHECK と対）

### グラフ全体を見るもの — `src/domain/` の純粋関数

複数のレコードを突き合わせないと判定できない。**API 層とレイアウトエンジンの
両方から同じ関数を呼ぶ。** どちらか一方に実装を置くと、もう一方が
検証を素通りするか、同じ判定を二重に持って食い違う。

4. **自己親子の禁止** — `child_id` が同 family の `partner1_id` / `partner2_id` と一致しない
5. **祖先ループの検出** — 血縁グラフをトポロジカルソートし、循環があれば登録を拒否する。
   手入力なので必ず誤登録が起きる前提で組む
6. **参照整合性** — family の partner と family_children の参照先が実在すること

### DB の制約に任せるもの

7. **人物削除** — partner として参照されている人物は削除できない（`ON DELETE RESTRICT`）。
   先に family を削除させる。子としての参照は `ON DELETE CASCADE` で消える
8. **重複登録** — 同一人物が同一 family に `biological` と `adopted` の両方で入らないこと
   （`PRIMARY KEY (family_id, child_id)`）

## 続柄の導出

続柄は入力させず、構造から計算する。実装は `src/domain/kinship/`。

- 対象 family の子を `sibling_order` 昇順に並べる
- `biological` の子を `sex` ごとに採番
  - 男: 長男 / 二男 / 三男 …
  - 女: 長女 / 二女 / 三女 …
  - `sex` が NULL: 番号を振らず「子」
- `adopted` の子: 養子 / 養女（`sex` が NULL なら「養子」）
- 複数 family に属する人物は family ごとに異なる続柄を持つ。
  家系図上では**その線が接続している family の続柄**を表示する

戸籍の表記は「次男」ではなく **「二男」**。同様に「二女」。

「嫡出子 / 庶子」の区別は構造から導出できない。必要なら `persons.note` で補う。

## 意図的に持たなかったもの

| 持たなかったもの | 理由 |
|---|---|
| 生没年月日（年より細かい粒度） | 表示しない情報に入力コストを払わせない。年だけで同姓同名の識別には足りる |
| 戸籍の本籍地・筆頭者 | 現時点の要件が「氏名と続柄のみ」。必要になったら `persons` に足せる |
| 続柄カラム | 構造から導出できるものを二重に持つと必ず不整合が起きる |
| 離婚・死別のステータス | 家系図の表示に影響しない。必要になったら `families.kind` を拡張する |

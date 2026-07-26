# 用語集

コード・コミットログ・ドキュメントで同じ概念を同じ語で呼ぶための対応表。
**ここにある語は、コード上の識別子もこの綴りに揃える。**

## ドメイン用語

| 日本語 | 識別子 | 意味 |
|---|---|---|
| 家系 | `genealogy` | `persons` / `families` / `familyChildren` をまとめた家系図データ一式 |
| 人物 | `person` / `persons` | 家系図に載る個人 |
| 家族ユニット | `family` / `families` | 婚姻、または片親のみの親グループ。子はここに属する |
| 配偶者 | `partner` | family を構成する人物。`partner1` が左、`partner2` が右 |
| 婚姻順序 | `partnerNOrder` | その人物にとって何度目の婚姻か |
| 実子 | `biological` | 血縁の親子関係。実線で描く |
| 養子 | `adopted` | 養子縁組による親子関係。点線で描く |
| 兄弟順 | `siblingOrder` | family の中での子の並び順 |
| 続柄 | `kinshipTerm` | 長男 / 二女 / 養子 など。構造から導出する |
| 世代 | `generation` | 家系図の段。祖先が 0、下るほど増える |
| 主系統 | `primaryFamily` | 人物が所属する family のうち、木として配置する際に採用する1つ |
| グラフ検証 | `validateGenealogyGraph` | 家系全体を突き合わせないと判定できない不正の検出。自己親子・祖先ループ・参照整合性 |
| 違反 | `GraphViolation` | グラフ検証が検出した不正。1件でもあれば登録を拒否する |
| 自己親子 | `selfParent` | 自分が partner である family の子になっている誤登録 |
| 祖先ループ | `ancestorLoop` | 血縁を辿ると自分自身に戻る誤登録 |
| 参照切れ | `unknownPartner` / `unknownFamily` / `unknownChild` | 実在しない人物・family を指している誤登録 |

## レイアウト用語

| 日本語 | 識別子 | 意味 |
|---|---|---|
| レイアウト計算 | `computeLayout` | 世代割当から向き変換までを繋ぐ入口。描画側が呼ぶ唯一の関数 |
| レイアウト | `Layout` | レイアウト計算の出力。`nodes` / `links` / `diagnostics` を持つ |
| ノード | `LayoutNode` | 画面座標に置かれた1人。`personId` と `(x, y)` |
| 世代軸 | `generationAxis` | 抽象座標のうち、世代が進む方向 |
| 兄弟軸 | `siblingAxis` | 抽象座標のうち、同世代内で並ぶ方向 |
| 向き変換 | `orientation adapter` | 抽象座標を画面座標 `(x, y)` に変換する関数 |
| 診断 | `diagnostics` | レイアウト計算中に検出した警告（世代の矛盾など） |
| 世代割当 | `assignGenerations` | 家系から各人物の世代を求める。差分制約系として解く |
| 世代指定 | `generationOverride` | 世代割当が矛盾したときの手動指定。正規化のあとに上書きする |
| 横位置計算 | `assignSiblingPositions` | 主系統の森から各人物の兄弟軸上の位置を求める |
| 配偶ブロック | `spouseBlock` | 横位置計算の木の節。1人のホストとその配偶者たちをまとめた単位 |
| ホスト | `host` | 配偶ブロックの中心になる人物。主系統を持つ側が務め、配偶者はその隣に付く |
| 婚姻制約の矛盾 | `marriageConflict` | 配偶者の世代を揃えられなかった。婚姻制約を落として続ける |
| 血縁制約の矛盾 | `biologicalConflict` | 実親と子の世代差を1にできなかった。後の制約を落として続ける |
| 結線パス生成 | `buildLinkPaths` | 配置の確定した家系から、線種ごとの経路を求める |
| 結線 | `LayoutLink` | 線種・形状・経路を持つ1本の線。結線パス生成の出力 |
| 線種 | `LinkKind` | `marriage` / `biological` / `adopted` / `siblingBar` |
| 形状 | `Segment` / `CubicBezier` | 経路の形。直線は2点、3次ベジェは4点で、点数は型で固定する |
| 抽象座標の点 | `AbstractPoint` | `(generationAxis, siblingAxis)` の1点 |
| 画面座標の点 | `ScreenPoint` | `(x, y)` の1点。向き変換の出力 |
| 画面座標の結線 | `ScreenLink` | 経路を画面座標に移した結線 |
| 上→下の向き | `topToBottom` | 世代が上から下へ進む向き変換。現時点で唯一の実装 |
| family の基点 | `familyAnchor` | 婚姻線の中点。子へ降りる幹の根本になる |
| 婚姻線 | `MarriageLink` | partner 間を結ぶ二重線 |
| 親子線 | `ChildLink` | 親 family から子へ引く線。実線 / 点線 |
| 兄弟バー | `siblingBar` | 同一 family の子をまとめる横線と、基点からそこへ降りる幹 |

## 使い分けに注意する語

**「婚姻」と「家族ユニット」を混同しない。**
`families` は婚姻していない親グループ（`kind: 'unmarried'`）や
片親のみの場合も含む。「婚姻」は `kind: 'marriage'` の family を指す。

**「親子関係」を `parentChild` と呼ばない。**
このモデルでは (親, 子) のペアを直接持たない。子は family に属する。
`familyChildren` が正しい呼び方。

**続柄の表記は戸籍に合わせる。**
「次男」ではなく **「二男」**。同様に「二女」。

**「違反」と「診断」を混同しない。**
`GraphViolation` は登録を拒否する不正で、検出したら家系図を描かない。
`diagnostics` はレイアウト計算中の警告で、描画は続ける。
世代制約の矛盾（叔父と姪の婚姻）は前者ではなく後者。

**「世代」は0始まり。**
「第1世代」のような1始まりの表記は UI 上でも使わない。混乱の元になる。

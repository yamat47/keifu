# Architecture Decision Records

設計上の判断と、**なぜそう判断したか**を残す場所。

コミットログに書く Why は「この変更をなぜ入れたか」という粒度で、
時間が経つと該当コミットを探し出せなくなる。
複数のコミットにまたがる、あるいは後から必ず「なぜこうなっている？」と聞かれる判断は
ADR として独立させる。

## 書くべきタイミング

- 複数の選択肢を比較して1つを選んだとき
- 一見不自然に見える実装を、理由があって採用したとき
- 「素直にやるとこうなるが、それでは駄目な理由がある」とき
- 後から誰か（未来の自分を含む）が元に戻したくなりそうなとき

逆に、選択肢が実質1つしかなかった判断は書かない。ノイズになる。

## 書き方

`/adr <決定の要約>` で雛形を作る。番号は連番、ファイル名は `NNNN-英語のスラッグ.md`。

一度 Accepted にした ADR は**書き換えない**。判断が変わったら新しい ADR を書き、
古い方の Status を `Superseded by ADR-NNNN` に変える。判断の変遷自体が記録になる。

## 一覧

| # | 決定 | Status |
|---|---|---|
| [0001](0001-family-unit-data-model.md) | 親子関係を家族ユニット経由で表現する | Accepted |
| [0002](0002-generation-assignment.md) | 世代割当を差分制約系として解く | Accepted |
| [0003](0003-workers-and-local-dev.md) | Cloudflare Workers + Static Assets を使い、ローカルは Vite プラグインで動かす | Accepted |
| [0004](0004-fixtures-as-a-leaf.md) | fixtures を全層から import できる葉として扱う | Accepted |

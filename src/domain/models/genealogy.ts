import { z } from 'zod'

import { familySchema, partnerIdsOf } from './family'
import { familyChildSchema, type FamilyChild } from './family-child'
import { personSchema } from './person'

/**
 * 家系図データ一式。レイアウトエンジンの入力になる。
 *
 * 参照整合性・自己親子・祖先ループはここでは検証しない。
 * グラフ全体を突き合わせないと判定できないものは、レイアウト計算とは独立した
 * 純粋関数に置き、書き込み API からも同じ関数を呼ぶ。
 * → docs/design/data-model.md「アプリ側で担保するバリデーション」
 */
export const genealogySchema = z.object({
  persons: z.array(personSchema),
  families: z.array(familySchema),
  familyChildren: z.array(familyChildSchema),
})

export type Genealogy = z.output<typeof genealogySchema>

/**
 * family ごとの子を兄弟順に並べて引けるようにする。
 *
 * 兄弟順の全順序（`siblingOrder` が同値なら `childId`）はここでだけ決める。
 * 2箇所に散らすと、配置上の兄弟の並びと結線の並びが黙ってずれる。
 */
export function childrenByFamily({ familyChildren }: Genealogy): Map<number, FamilyChild[]> {
  const grouped = new Map<number, FamilyChild[]>()

  // 先に全体を並べてからグループ化する。グループ化は相対順を保つので family ごとの整列は要らない
  for (const membership of [...familyChildren].sort(
    (a, b) => a.siblingOrder - b.siblingOrder || a.childId - b.childId,
  )) {
    const siblings = grouped.get(membership.familyId)
    if (siblings === undefined) grouped.set(membership.familyId, [membership])
    else siblings.push(membership)
  }

  return grouped
}

/** 血縁の (親, 子)。どの family 経由かを持つ */
export type BiologicalLink = { familyId: number; parentId: number; childId: number }

/**
 * 血縁の親子を1件ずつ取り出す。家系をグラフとして辿るものは全てここを通る。
 *
 * 養子リンクは含めない。含めると実親経由と養親経由で世代が矛盾するケースが
 * 頻発し、ほとんどの家系で警告が出て使い物にならなくなる
 * → docs/adr/0002-generation-assignment.md
 */
export function biologicalLinksOf({ families, familyChildren }: Genealogy): BiologicalLink[] {
  const familiesById = new Map(families.map((family) => [family.id, family]))

  return familyChildren.flatMap(({ familyId, childId, relationType }) => {
    if (relationType !== 'biological') return []

    const family = familiesById.get(familyId)
    if (family === undefined) return []

    return partnerIdsOf(family).map((parentId) => ({ familyId, parentId, childId }))
  })
}

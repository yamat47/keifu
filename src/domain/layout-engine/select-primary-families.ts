import type { FamilyChild, Genealogy } from '../models'

/** personId → 主系統の familyId。親 family を持たない人物は載らない */
export type PrimaryFamilies = Map<number, number>

/**
 * familyChildren の並び順で決めてはいけない。並び順は入力の都合で変わりうるのに対し、
 * 主系統は同じ家系からは常に同じものが選ばれる必要がある
 * → docs/design/layout-engine.md「2. 主系統の抽出」
 */
function isPreferredOver(candidate: FamilyChild, current: FamilyChild): boolean {
  if (candidate.relationType !== current.relationType) {
    return candidate.relationType === 'biological'
  }
  return candidate.familyId < current.familyId
}

/**
 * 各人物について、子として所属する family のうち1つを主系統として選ぶ。
 * 主系統だけを残すとグラフは森になり、木のレイアウトを適用できる。
 *
 * 参照整合性は前提とする。`validateGenealogyGraph` を通っていない家系を渡すと、
 * 収録されていない family を主系統として返しうる。
 */
export function selectPrimaryFamilies({ familyChildren }: Genealogy): PrimaryFamilies {
  const chosen = new Map<number, FamilyChild>()

  for (const membership of familyChildren) {
    const current = chosen.get(membership.childId)
    if (current === undefined || isPreferredOver(membership, current)) {
      chosen.set(membership.childId, membership)
    }
  }

  return new Map([...chosen].map(([childId, { familyId }]) => [childId, familyId]))
}

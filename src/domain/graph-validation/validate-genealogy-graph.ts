import {
  partnerIdsOf,
  type Family,
  type FamilyChild,
  type Genealogy,
  type Person,
} from '../models'

export type GraphViolation =
  | { kind: 'unknownPartner'; familyId: number; personId: number }
  | { kind: 'unknownFamily'; familyId: number; childId: number }
  | { kind: 'unknownChild'; familyId: number; childId: number }
  | { kind: 'selfParent'; familyId: number; personId: number }
  /**
   * personIds は親から子へ辿った順。最小の id が先頭に来るよう回転してある。
   *
   * 循環が複数あるとき、全てを列挙することは保証しない。登録を拒否するには
   * 1本見つかれば足り、直したあとに検証し直せば残りが出る。
   */
  | { kind: 'ancestorLoop'; personIds: number[] }

/** 血縁の親 → 子。養子リンクは辿らない */
function biologicalChildrenOf(
  familyChildren: FamilyChild[],
  familiesById: Map<number, Family>,
): Map<number, number[]> {
  const childrenOf = new Map<number, number[]>()

  for (const { familyId, childId, relationType } of familyChildren) {
    // 養子縁組は血のつながりによる世代を変えないので、祖先ループの判定にも含めない。
    // 含めると「孫を養子に取る」ような戸籍上ありうる登録が弾かれる
    // → docs/adr/0002-generation-assignment.md
    if (relationType !== 'biological') continue

    const family = familiesById.get(familyId)
    if (family === undefined) continue

    for (const parentId of partnerIdsOf(family)) {
      // 自己親子は selfParent として報告済み。ここでも長さ1の循環として拾うと、
      // 1つの誤登録に2種類の違反が出てどちらを直せばよいか分からなくなる
      if (parentId === childId) continue

      const children = childrenOf.get(parentId)
      if (children === undefined) childrenOf.set(parentId, [childId])
      else children.push(childId)
    }
  }

  return childrenOf
}

/** 循環の表記を、どの人物から辿り始めたかに依らず一意にする */
function rotateToSmallest(loop: number[]): number[] {
  const at = loop.indexOf(Math.min(...loop))
  return [...loop.slice(at), ...loop.slice(0, at)]
}

function findAncestorLoops(persons: Person[], childrenOf: Map<number, number[]>): number[][] {
  const state = new Map<number, 'visiting' | 'done'>()
  const path: number[] = []
  const loops: number[][] = []

  const visit = (personId: number): void => {
    const visited = state.get(personId)
    if (visited === 'done') return
    if (visited === 'visiting') {
      loops.push(rotateToSmallest(path.slice(path.indexOf(personId))))
      return
    }

    state.set(personId, 'visiting')
    path.push(personId)
    for (const childId of childrenOf.get(personId) ?? []) visit(childId)
    path.pop()
    state.set(personId, 'done')
  }

  for (const { id } of persons) visit(id)

  return loops
}

/**
 * 家系全体を突き合わせないと判定できない不正を検出する。
 * 1件でも返ったら登録を拒否する。
 */
export function validateGenealogyGraph({
  persons,
  families,
  familyChildren,
}: Genealogy): GraphViolation[] {
  const personIds = new Set(persons.map(({ id }) => id))
  const familiesById = new Map(families.map((family) => [family.id, family]))

  const unknownPartners = families.flatMap((family) =>
    partnerIdsOf(family)
      .filter((personId) => !personIds.has(personId))
      .map((personId) => ({ kind: 'unknownPartner' as const, familyId: family.id, personId })),
  )

  const unknownFamilies = familyChildren
    .filter(({ familyId }) => !familiesById.has(familyId))
    .map(({ familyId, childId }) => ({ kind: 'unknownFamily' as const, familyId, childId }))

  const unknownChildren = familyChildren
    .filter(({ childId }) => !personIds.has(childId))
    .map(({ familyId, childId }) => ({ kind: 'unknownChild' as const, familyId, childId }))

  const selfParents = familyChildren
    .filter(({ familyId, childId }) => {
      const family = familiesById.get(familyId)
      return family !== undefined && partnerIdsOf(family).includes(childId)
    })
    .map(({ familyId, childId }) => ({
      kind: 'selfParent' as const,
      familyId,
      personId: childId,
    }))

  const childrenOf = biologicalChildrenOf(familyChildren, familiesById)
  const ancestorLoops = findAncestorLoops(persons, childrenOf).map((personIds) => ({
    kind: 'ancestorLoop' as const,
    personIds,
  }))

  return [
    ...unknownPartners,
    ...unknownFamilies,
    ...unknownChildren,
    ...selfParents,
    ...ancestorLoops,
  ]
}

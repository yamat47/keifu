import { describe, expect, it } from 'vitest'

import { partnerIdsOf } from '../domain/models'

import { sampleGenealogy } from './sample-genealogy'

const { persons, families, familyChildren } = sampleGenealogy

const personIds = new Set(persons.map((p) => p.id))
const familyIds = new Set(families.map((f) => f.id))

const childrenOf = (familyId: number) => familyChildren.filter((fc) => fc.familyId === familyId)

/** 実親を辿れる人物の、実親からの深さ。実親が未登録の人物は持たない */
function biologicalDepth(): Map<number, number> {
  const parentsOf = new Map<number, number[]>()
  for (const { familyId, childId, relationType } of familyChildren) {
    if (relationType !== 'biological') continue
    const family = families.find((f) => f.id === familyId)
    // data-model.md は同一人物が複数の家系ラインに接続することを許している。
    // 上書きすると実親 family を2つ持つ子の片方が消え、深さが浅く出る
    if (family) parentsOf.set(childId, [...(parentsOf.get(childId) ?? []), ...partnerIdsOf(family)])
  }

  const memo = new Map<number, number>()
  const depthOf = (personId: number): number => {
    const cached = memo.get(personId)
    if (cached !== undefined) return cached

    const parents = parentsOf.get(personId) ?? []
    memo.set(personId, 0) // 祖先ループがあっても停止させる
    const depth = parents.length === 0 ? 0 : Math.max(...parents.map(depthOf)) + 1
    memo.set(personId, depth)
    return depth
  }

  return new Map([...parentsOf.keys()].map((id) => [id, depthOf(id)]))
}

/** family の partner 同士・family と子を同じ塊とみなしたときの連結成分の個数 */
function countComponents(): number {
  const parent = new Map(persons.map(({ id }) => [id, id]))
  const find = (id: number): number => {
    const up = parent.get(id)
    if (up === undefined || up === id) return id
    const root = find(up)
    parent.set(id, root)
    return root
  }
  const union = (a: number, b: number) => parent.set(find(a), find(b))

  for (const family of families) {
    const members = [...partnerIdsOf(family), ...childrenOf(family.id).map((fc) => fc.childId)]
    for (const id of members.slice(1)) union(members[0]!, id)
  }

  return new Set(persons.map(({ id }) => find(id))).size
}

describe('サンプル家系', () => {
  // 不正な家系なら sample-genealogy.ts の parse が import 時に落ちる。
  // ここで検証したいのは、生のリテラルではなく既定値適用後の形が公開されていること
  it('スキーマの既定値が適用された形で公開されている', () => {
    expect(families.every((f) => f.kind === 'marriage' || f.kind === 'unmarried')).toBe(true)
    expect(familyChildren.every((fc) => Number.isInteger(fc.siblingOrder))).toBe(true)
    expect(persons.every((p) => 'generationOverride' in p)).toBe(true)
  })

  it('15人を収録している', () => {
    expect(persons).toHaveLength(15)
  })

  it('人物の id が重複しない', () => {
    expect(personIds.size).toBe(persons.length)
  })

  it('family の id が重複しない', () => {
    expect(familyIds.size).toBe(families.length)
  })

  it('family の partner は全て収録済みの人物を指す', () => {
    const unknown = families.flatMap(partnerIdsOf).filter((id) => !personIds.has(id))

    expect(unknown).toEqual([])
  })

  it('子は全て収録済みの family と人物を指す', () => {
    const orphans = familyChildren.filter(
      (fc) => !personIds.has(fc.childId) || !familyIds.has(fc.familyId),
    )

    expect(orphans).toEqual([])
  })

  it('同一 family の中で兄弟順が重複しない', () => {
    const collided = families.filter((family) => {
      const orders = childrenOf(family.id).map((fc) => fc.siblingOrder)
      return new Set(orders).size !== orders.length
    })

    expect(collided).toEqual([])
  })

  it('再婚を含む — 同じ人物が2つの family の partner になり、婚姻順序が異なる', () => {
    const remarried = persons.filter(({ id }) => {
      const orders = families.flatMap((f) => [
        f.partner1Id === id ? f.partner1Order : null,
        f.partner2Id === id ? f.partner2Order : null,
      ])

      return new Set(orders.filter((o) => o !== null)).size >= 2
    })

    expect(remarried.length).toBeGreaterThan(0)
  })

  it('養子縁組を含む — 同じ人物が実親 family と養親 family の両方に属する', () => {
    const adoptees = persons.filter(({ id }) => {
      const types = familyChildren.filter((fc) => fc.childId === id).map((fc) => fc.relationType)
      return types.includes('biological') && types.includes('adopted')
    })

    expect(adoptees.length).toBeGreaterThan(0)
  })

  it('片親のみ判明の family を含む', () => {
    expect(families.filter((f) => partnerIdsOf(f).length === 1).length).toBeGreaterThan(0)
  })

  it('連結していない複数のルートを含む', () => {
    expect(countComponents()).toBeGreaterThanOrEqual(2)
  })

  // 双方が血縁で世代を固定されている必要がある。片方が嫁いできただけの人物なら
  // 婚姻制約で引き上げられて矛盾しない。負閉路そのものの検出は Phase 1 の責務
  it('世代の矛盾を含む — 双方が実親を持ち、かつ実親からの深さが異なる婚姻がある', () => {
    const depth = biologicalDepth()
    const contradictions = families.filter(({ partner1Id, partner2Id }) => {
      if (partner1Id === null || partner2Id === null) return false
      const [a, b] = [depth.get(partner1Id), depth.get(partner2Id)]
      return a !== undefined && b !== undefined && a !== b
    })

    expect(contradictions.length).toBeGreaterThan(0)
  })

  it('性別が判明していない人物を含む', () => {
    expect(persons.filter((p) => p.sex === null).length).toBeGreaterThan(0)
  })
})

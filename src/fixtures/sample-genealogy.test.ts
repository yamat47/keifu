import { describe, expect, it } from 'vitest'

import { genealogySchema } from '../domain/models'

import { sampleGenealogy } from './sample-genealogy'

const { persons, families, familyChildren } = sampleGenealogy

/** 血縁の親を辿れる人物の、実親からの深さ。親が未登録の人物は持たない */
function 血縁の深さ(): Map<number, number> {
  const 実親 = new Map<number, number[]>()
  for (const { familyId, childId, relationType } of familyChildren) {
    if (relationType !== 'biological') continue
    const family = families.find((f) => f.id === familyId)
    if (!family) continue
    実親.set(childId, [family.partner1Id, family.partner2Id].filter((id) => id !== null))
  }

  const memo = new Map<number, number>()
  const 深さ = (personId: number): number => {
    const 記憶 = memo.get(personId)
    if (記憶 !== undefined) return 記憶

    const 親 = 実親.get(personId) ?? []
    memo.set(personId, 0) // 祖先ループがあっても停止させる
    const d = 親.length === 0 ? 0 : Math.max(...親.map(深さ)) + 1
    memo.set(personId, d)
    return d
  }

  return new Map(persons.filter(({ id }) => 実親.has(id)).map(({ id }) => [id, 深さ(id)]))
}

/** family の partner 同士・family と子を同じ塊とみなしたときの連結成分の個数 */
function 連結成分の個数(): number {
  const 代表 = new Map(persons.map(({ id }) => [id, id]))
  const 根 = (id: number): number => {
    const 親 = 代表.get(id)
    if (親 === undefined || 親 === id) return id
    const r = 根(親)
    代表.set(id, r)
    return r
  }
  const 併合 = (a: number, b: number) => 代表.set(根(a), 根(b))

  for (const family of families) {
    const 構成員 = [family.partner1Id, family.partner2Id].filter((id) => id !== null)
    const 子 = familyChildren.filter((fc) => fc.familyId === family.id).map((fc) => fc.childId)
    const 全員 = [...構成員, ...子]
    for (const id of 全員.slice(1)) 併合(全員[0]!, id)
  }

  return new Set(persons.map(({ id }) => 根(id))).size
}

describe('サンプル家系', () => {
  it('スキーマを通る', () => {
    expect(genealogySchema.safeParse(sampleGenealogy).success).toBe(true)
  })

  it('15人を収録している', () => {
    expect(persons).toHaveLength(15)
  })

  it('人物の id が重複しない', () => {
    expect(new Set(persons.map((p) => p.id)).size).toBe(persons.length)
  })

  it('family の id が重複しない', () => {
    expect(new Set(families.map((f) => f.id)).size).toBe(families.length)
  })

  it('family の partner は全て収録済みの人物を指す', () => {
    const 収録済み = new Set(persons.map((p) => p.id))
    const partner = families.flatMap((f) => [f.partner1Id, f.partner2Id]).filter((id) => id !== null)

    expect(partner.filter((id) => !収録済み.has(id))).toEqual([])
  })

  it('子は全て収録済みの family と人物を指す', () => {
    const 収録済みの人物 = new Set(persons.map((p) => p.id))
    const 収録済みのfamily = new Set(families.map((f) => f.id))
    const 迷子 = familyChildren.filter(
      (fc) => !収録済みの人物.has(fc.childId) || !収録済みのfamily.has(fc.familyId),
    )

    expect(迷子).toEqual([])
  })

  it('同一 family の中で兄弟順が重複しない', () => {
    const 重複 = families.filter((family) => {
      const 順 = familyChildren.filter((fc) => fc.familyId === family.id).map((fc) => fc.siblingOrder)
      return new Set(順).size !== 順.length
    })

    expect(重複).toEqual([])
  })

  it('再婚を含む — 同じ人物が2つの family の partner になり、婚姻順序が異なる', () => {
    const 再婚した人物 = persons.filter(({ id }) => {
      const 婚姻順 = families.flatMap((f) => [
        f.partner1Id === id ? f.partner1Order : null,
        f.partner2Id === id ? f.partner2Order : null,
      ])

      return new Set(婚姻順.filter((o) => o !== null)).size >= 2
    })

    expect(再婚した人物.length).toBeGreaterThan(0)
  })

  it('養子縁組を含む — 同じ人物が実親 family と養親 family の両方に属する', () => {
    const 養子 = persons.filter(({ id }) => {
      const 種別 = familyChildren.filter((fc) => fc.childId === id).map((fc) => fc.relationType)
      return 種別.includes('biological') && 種別.includes('adopted')
    })

    expect(養子.length).toBeGreaterThan(0)
  })

  it('片親のみ判明の family を含む', () => {
    const 片親 = families.filter((f) => f.partner1Id === null || f.partner2Id === null)

    expect(片親.length).toBeGreaterThan(0)
  })

  it('連結していない複数のルートを含む', () => {
    expect(連結成分の個数()).toBeGreaterThanOrEqual(2)
  })

  // 双方が血縁で世代を固定されている必要がある。片方が嫁いできただけの人物なら
  // 婚姻制約で引き上げられて矛盾しない。負閉路そのものの検出は Phase 1 の責務
  it('世代の矛盾を含む — 双方が実親を持ち、かつ実親からの深さが異なる婚姻がある', () => {
    const 深さ = 血縁の深さ()
    const 矛盾 = families.filter(({ partner1Id, partner2Id }) => {
      if (partner1Id === null || partner2Id === null) return false
      const [a, b] = [深さ.get(partner1Id), 深さ.get(partner2Id)]
      return a !== undefined && b !== undefined && a !== b
    })

    expect(矛盾.length).toBeGreaterThan(0)
  })

  it('性別が判明していない人物を含む', () => {
    expect(persons.filter((p) => p.sex === null).length).toBeGreaterThan(0)
  })
})

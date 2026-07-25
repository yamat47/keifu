import { describe, expect, it } from 'vitest'

import { sampleGenealogy } from '../../fixtures/sample-genealogy'
import { genealogySchema, type FamilyChild } from '../models'

import { selectPrimaryFamilies } from './select-primary-families'

/**
 * 3 が family 1, 2, ... の子になっている家系を、関係の種別を変えて作る。
 * 渡した順に familyId が 1 から振られる。
 */
const childBelongingTo = (...relationTypes: FamilyChild['relationType'][]) =>
  genealogySchema.parse({
    persons: [
      { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
      { id: 2, familyName: '立花', givenName: '五郎', sex: 'm' },
      { id: 3, familyName: '桐生', givenName: '春彦', sex: 'm' },
    ],
    families: [
      { id: 1, partner1Id: 1, partner2Id: null },
      { id: 2, partner1Id: 2, partner2Id: null },
    ],
    familyChildren: relationTypes.map((relationType, index) => ({
      familyId: index + 1,
      childId: 3,
      relationType,
    })),
  })

describe('selectPrimaryFamilies', () => {
  it('実親 family の子である人物は、その family が主系統になる', () => {
    const primaryFamilies = selectPrimaryFamilies(sampleGenealogy)

    // 3（春彦）は宗一郎・志乃の family 1 の実子
    expect(primaryFamilies.get(3)).toBe(1)
  })

  it('実親と養親の両方に属する人物は、familyId が大きくても実親 family が主系統になる', () => {
    // 養親を先に、かつ familyId が小さくなる側に置く。こうしないと
    // 「先に見つけたほうを採る」実装でも「familyId が最小のものを採る」実装でも通ってしまう
    const primaryFamilies = selectPrimaryFamilies(childBelongingTo('adopted', 'biological'))

    expect(primaryFamilies.get(3)).toBe(2)
  })

  it('養子縁組でしか family に属さない人物は、養親 family が主系統になる', () => {
    const primaryFamilies = selectPrimaryFamilies(childBelongingTo('adopted'))

    expect(primaryFamilies.get(3)).toBe(1)
  })

  it('同じ関係の family が複数あるときは、familyId が最小のものを選ぶ', () => {
    const primaryFamilies = selectPrimaryFamilies(childBelongingTo('biological', 'biological'))

    expect(primaryFamilies.get(3)).toBe(1)
  })

  it('どの family の子でもない人物は、主系統を持たない', () => {
    const primaryFamilies = selectPrimaryFamilies(sampleGenealogy)

    // 1（宗一郎）は最上位世代で、誰の子でもない
    expect(primaryFamilies.has(1)).toBe(false)
  })

  it('子として family に属する人物は、漏れなく主系統を持つ', () => {
    const primaryFamilies = selectPrimaryFamilies(sampleGenealogy)

    const childIds = new Set(sampleGenealogy.familyChildren.map(({ childId }) => childId))
    expect(new Set(primaryFamilies.keys())).toEqual(childIds)
  })

  it('同じ家系を2回渡すと、完全に同じ結果になる', () => {
    const first = selectPrimaryFamilies(sampleGenealogy)
    const second = selectPrimaryFamilies(sampleGenealogy)

    expect([...first]).toEqual([...second])
  })
})

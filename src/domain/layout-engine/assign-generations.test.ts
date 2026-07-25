import { describe, expect, it } from 'vitest'

import { sampleGenealogy } from '../../fixtures/sample-genealogy'
import { genealogySchema } from '../models'

import { assignGenerations } from './assign-generations'

/** 1 → 2 → 3 の直系。2 にだけ世代指定が入っている */
const overriddenLine = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm', generationOverride: 5 },
    { id: 3, familyName: '桐生', givenName: '光一', sex: 'm' },
  ],
  families: [
    { id: 1, partner1Id: 1, partner2Id: null },
    { id: 2, partner1Id: 2, partner2Id: null },
  ],
  familyChildren: [
    { familyId: 1, childId: 2 },
    { familyId: 2, childId: 3 },
  ],
})

/** 3 が 1 の実子であると同時に、1 の実子である 2 の実子にもなっている */
const conflictingBiologicalLines = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm' },
    { id: 3, familyName: '桐生', givenName: '光一', sex: 'm' },
  ],
  families: [
    { id: 1, partner1Id: 1, partner2Id: null },
    { id: 2, partner1Id: 2, partner2Id: null },
  ],
  familyChildren: [
    { familyId: 1, childId: 2 },
    { familyId: 1, childId: 3 },
    { familyId: 2, childId: 3 },
  ],
})

/**
 * 春彦には子のいない婚姻が2つある。
 *
 * sampleGenealogy の夫婦はいずれも子を持つため、婚姻制約が無くても血縁制約だけで
 * 世代が揃ってしまい、婚姻制約が効いていることを確かめられない。
 */
const childlessMarriages = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm' },
    { id: 3, familyName: '桐生', givenName: '千代', sex: 'f' },
    { id: 4, familyName: '桐生', givenName: '佳代', sex: 'f' },
  ],
  families: [
    { id: 1, partner1Id: 1, partner2Id: null },
    { id: 2, partner1Id: 2, partner2Id: 3, partner1Order: 1, partner2Order: 1 },
    { id: 3, partner1Id: 2, partner2Id: 4, partner1Order: 2, partner2Order: 1 },
  ],
  familyChildren: [{ familyId: 1, childId: 2 }],
})

/** 2 はどの family にも属さない */
const solitaryPerson = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '立花', givenName: '五郎', sex: 'm' },
  ],
  families: [],
  familyChildren: [],
})

describe('assignGenerations', () => {
  it('直系の3世代には 0, 1, 2 が順に割り当たる', () => {
    const { generations } = assignGenerations(sampleGenealogy)

    expect(generations.get(1)).toBe(0)
    expect(generations.get(3)).toBe(1)
    expect(generations.get(7)).toBe(2)
  })

  it('子のいない婚姻でも、partner は同じ世代になる', () => {
    const { generations } = assignGenerations(childlessMarriages)

    expect(generations.get(2)).toBe(1)
    expect(generations.get(3)).toBe(1)
  })

  it('再婚した相手も、子がいなければ相手と同じ世代になる', () => {
    const { generations } = assignGenerations(childlessMarriages)

    expect(generations.get(4)).toBe(1)
  })

  it('養子の世代は、養親経由ではなく血縁の親経由で決まる', () => {
    const { generations } = assignGenerations(sampleGenealogy)

    // 12（奥平 実）は秋乃の実子であり、同時に宗一郎（世代0）の養子
    expect(generations.get(5)).toBe(1)
    expect(generations.get(12)).toBe(2)
  })

  it('片親しか判明していない family でも子の世代が決まる', () => {
    const { generations } = assignGenerations(sampleGenealogy)

    // 立花家は母が判明しておらず partner2Id が null
    expect(generations.get(13)).toBe(0)
    expect(generations.get(14)).toBe(1)
  })

  it('連結していない家系は、それぞれの最小世代が 0 になる', () => {
    const { generations } = assignGenerations(sampleGenealogy)

    const lowestOf = (ids: number[]) => Math.min(...ids.map((id) => generations.get(id) ?? -1))

    expect(lowestOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(0)
    expect(lowestOf([13, 14, 15])).toBe(0)
  })

  it('叔父と姪の婚姻は例外を投げず、婚姻制約を落として診断に積まれる', () => {
    const { diagnostics } = assignGenerations(sampleGenealogy)

    // family 6 は夏彦（宗一郎の二男）と真澄（春彦の長女）の婚姻
    expect(diagnostics).toEqual([
      { kind: 'marriageConflict', familyId: 6, partner1Id: 4, partner2Id: 8 },
    ])
  })

  it('婚姻制約を落とされた当事者は、血縁から決まる世代を保つ', () => {
    const { generations } = assignGenerations(sampleGenealogy)

    expect(generations.get(4)).toBe(1)
    expect(generations.get(8)).toBe(2)
  })

  it('血縁制約どうしが矛盾したら、後から課したほうが診断に積まれる', () => {
    const { generations, diagnostics } = assignGenerations(conflictingBiologicalLines)

    expect(diagnostics).toEqual([
      { kind: 'biologicalConflict', familyId: 2, parentId: 2, childId: 3 },
    ])
    expect(generations.get(3)).toBe(1)
  })

  it('世代指定のある人物は、正規化した世代ではなく指定した値になる', () => {
    const { generations } = assignGenerations(overriddenLine)

    expect(generations.get(2)).toBe(5)
  })

  it('世代指定は子には伝播しない', () => {
    const { generations } = assignGenerations(overriddenLine)

    expect(generations.get(3)).toBe(2)
  })

  it('どの family にも属さない人物は世代 0 になる', () => {
    const { generations } = assignGenerations(solitaryPerson)

    expect(generations.get(2)).toBe(0)
  })

  it('同じ家系を2回渡すと、完全に同じ結果になる', () => {
    const first = assignGenerations(sampleGenealogy)
    const second = assignGenerations(sampleGenealogy)

    expect([...first.generations]).toEqual([...second.generations])
    expect(first.diagnostics).toEqual(second.diagnostics)
  })
})

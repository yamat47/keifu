import { describe, expect, it } from 'vitest'

import { sampleGenealogy } from '../../fixtures/sample-genealogy'
import { shuffledSiblings, simpleCouple } from '../../fixtures/small-genealogies'
import { genealogySchema, type Genealogy } from '../models'

import { assignGenerations } from './assign-generations'
import { assignSiblingPositions } from './assign-sibling-positions'
import { selectPrimaryFamilies } from './select-primary-families'

const positionsOf = (genealogy: Genealogy) =>
  assignSiblingPositions(genealogy, selectPrimaryFamilies(genealogy))

/**
 * personId で位置を引く。落ちていたら例外にする。
 * `?? 0` で埋めると、位置が付いていない人物どうしの比較が黙って通ってしまう。
 */
const positionsIn = (genealogy: Genealogy) => {
  const positions = positionsOf(genealogy)

  return (id: number): number => {
    const position = positions.get(id)
    if (position === undefined) throw new Error(`位置が割り当てられていない: ${id}`)
    return position
  }
}

/**
 * 1 が 2 → 3 の順に婚姻しているが、family の ID は逆に振ってある。
 * sampleGenealogy は婚姻順と ID 順が一致しており、婚姻順で並べ替えなくても通ってしまう。
 */
const remarriageAgainstFamilyIds = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '春彦', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '千代', sex: 'f' },
    { id: 3, familyName: '桐生', givenName: '佳代', sex: 'f' },
  ],
  families: [
    { id: 1, partner1Id: 1, partner2Id: 3, partner1Order: 2, partner2Order: 1 },
    { id: 2, partner1Id: 1, partner2Id: 2, partner1Order: 1, partner2Order: 1 },
  ],
  familyChildren: [],
})

/**
 * 婚入した 4 が、兄弟 2・3 のうち 3 と先に婚姻している。
 * family の ID は逆に振ってあり、婚入者側の婚姻順を見ないと 2 の隣に付いてしまう。
 */
const remarriedIncomer = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '春彦', sex: 'm' },
    { id: 3, familyName: '桐生', givenName: '夏彦', sex: 'm' },
    { id: 4, familyName: '奥平', givenName: '千代', sex: 'f' },
  ],
  families: [
    { id: 1, partner1Id: 1, partner2Id: null },
    { id: 2, partner1Id: 2, partner2Id: 4, partner1Order: 1, partner2Order: 2 },
    { id: 3, partner1Id: 3, partner2Id: 4, partner1Order: 1, partner2Order: 1 },
  ],
  familyChildren: [
    { familyId: 1, childId: 2, siblingOrder: 0 },
    { familyId: 1, childId: 3, siblingOrder: 1 },
  ],
})

/** どちらも主系統を持たない夫婦が2組。partner1 と partner2 で ID の大小が逆になる */
const rootCouples = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '立花', givenName: '梅', sex: 'f' },
    { id: 2, familyName: '桐生', givenName: '志乃', sex: 'f' },
    { id: 3, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 4, familyName: '立花', givenName: '五郎', sex: 'm' },
  ],
  families: [
    { id: 1, partner1Id: 3, partner2Id: 2 },
    { id: 2, partner1Id: 4, partner2Id: 1 },
  ],
  familyChildren: [],
})

const at = positionsIn(sampleGenealogy)

describe('assignSiblingPositions', () => {
  it('夫婦は隣り合い、partner1 が左に来る', () => {
    const at = positionsIn(simpleCouple)

    expect(at(2)).toBe(at(1) + 1)
  })

  it('一人っ子は、親の夫婦の中央に置かれる', () => {
    const at = positionsIn(simpleCouple)

    expect(at(3)).toBe((at(1) + at(2)) / 2)
  })

  it('兄弟は siblingOrder 順に隙間なく並ぶ', () => {
    const at = positionsIn(shuffledSiblings)

    expect([4, 2, 3].map(at)).toEqual([0, 1, 2])
  })

  it('主系統を持つのが partner2 の側なら、配偶者は左に付く', () => {
    // family 4 は婚入した信昌（11）と、桐生家の秋乃（5）の婚姻
    expect(at(11)).toBe(at(5) - 1)
  })

  it('再婚した人物の配偶者は、婚姻順に並ぶ', () => {
    // 春彦（3）の初婚が千代（6）、再婚が佳代（9）
    expect([3, 6, 9].map(at)).toEqual([0, 1, 2])
  })

  it('配偶者の並びは family の ID 順ではなく婚姻順に従う', () => {
    const at = positionsIn(remarriageAgainstFamilyIds)

    // 初婚の千代（2）が先。family の ID では佳代（3）の側が小さい
    expect([1, 2, 3].map(at)).toEqual([0, 1, 2])
  })

  it('2度婚姻した婚入者が隣接するのは、自分にとって最初の婚姻の相手', () => {
    const at = positionsIn(remarriedIncomer)

    // 千代（4）にとって夏彦（3）が初婚、春彦（2）が再婚
    expect(at(4)).toBe(at(3) + 1)
  })

  it('主系統を持たない夫婦だけのルートは、partner1 の personId 順に左から並ぶ', () => {
    const at = positionsIn(rootCouples)

    // 桐生（partner1 は 3）、立花（partner1 は 4）の順。partner2 の ID では逆になる
    expect([3, 2, 4, 1].map(at)).toEqual([0, 1, 2, 3])
  })

  it('再婚した人物の子は、婚姻ごとに別のグループとして配置される', () => {
    // 初婚の子は光一（7）と真澄（8）、再婚の子は冬樹（10）
    expect(Math.max(...[7, 8].map(at))).toBeLessThan(at(10))
  })

  it('双方が主系統を持つ夫婦は、隣り合わない', () => {
    // family 6 は夏彦（4）と姪の真澄（8）の婚姻。どちらも桐生家の子である
    expect(Math.abs(at(4) - at(8))).toBeGreaterThan(1)
  })

  it('婚姻のために兄弟列から抜ける人物はいない', () => {
    // 真澄（8）は夏彦に嫁いでも、兄の光一（7）の隣に留まる
    expect(at(8)).toBe(at(7) + 1)
  })

  it('片親しか判明していない family でも、子は隙間なく並ぶ', () => {
    // 立花家は母が判明しておらず partner2Id が null
    expect(at(15)).toBe(at(14) + 1)
  })

  it('養子は、養親 family ではなく実親 family の下に置かれる', () => {
    // 実（12）は宗一郎の養子であり、秋乃（5）と信昌（11）の実子
    expect(at(12)).toBe((at(5) + at(11)) / 2)
  })

  it('連結していない複数のルートは、横に並んで重ならない', () => {
    const kiryu = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(at)
    const tachibana = [13, 14, 15].map(at)

    expect(Math.max(...kiryu)).toBeLessThan(Math.min(...tachibana))
  })

  it('同じ世代の人物どうしは、同じ位置に重ならない', () => {
    const { generations } = assignGenerations(sampleGenealogy)

    const occupied = sampleGenealogy.persons.map(({ id }) => `${generations.get(id)}:${at(id)}`)
    expect(new Set(occupied).size).toBe(sampleGenealogy.persons.length)
  })

  it('全ての人物が位置を持つ', () => {
    const positions = positionsOf(sampleGenealogy)

    expect(new Set(positions.keys())).toEqual(new Set(sampleGenealogy.persons.map(({ id }) => id)))
  })

  it('同じ家系を2回渡すと、完全に同じ結果になる', () => {
    expect([...positionsOf(sampleGenealogy)]).toEqual([...positionsOf(sampleGenealogy)])
  })
})

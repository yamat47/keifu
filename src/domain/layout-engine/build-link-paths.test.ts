import { describe, expect, it } from 'vitest'

import { sampleGenealogy } from '../../fixtures/sample-genealogy'
import { shuffledSiblings, simpleCouple, singleParent } from '../../fixtures/small-genealogies'
import { genealogySchema, type Genealogy } from '../models'

import { assignGenerations } from './assign-generations'
import { assignSiblingPositions } from './assign-sibling-positions'
import {
  buildLinkPaths,
  type AbstractPoint,
  type LayoutLink,
  type LinkKind,
  type Placement,
  type Segment,
} from './build-link-paths'
import { selectPrimaryFamilies } from './select-primary-families'

const point = (generationAxis: number, siblingAxis: number) => ({ generationAxis, siblingAxis })

/** 親子線なら子の personId、婚姻線と兄弟バーなら null */
const childIdOf = (link: LayoutLink): number | null => ('childId' in link ? link.childId : null)

const placementOf = (genealogy: Genealogy): Placement => {
  const { generations } = assignGenerations(genealogy)
  const primaryFamilies = selectPrimaryFamilies(genealogy)

  return {
    generations,
    primaryFamilies,
    siblingPositions: assignSiblingPositions(genealogy, primaryFamilies),
  }
}

const linksOf = (genealogy: Genealogy): LayoutLink[] =>
  buildLinkPaths(genealogy, placementOf(genealogy))

/** 線種で直線の経路を集める。曲線は含めない */
const segmentsOf = (genealogy: Genealogy, kind: LinkKind): Segment[] =>
  linksOf(genealogy).flatMap((link) =>
    link.kind === kind && link.shape === 'polyline' ? [link.points] : [],
  )

/**
 * 人物のノードが立つ点。
 * 落ちていたら例外にする。原点で埋めると、線が通っていないことを黙って通してしまう
 */
const nodesOf = (genealogy: Genealogy): AbstractPoint[] => {
  const { generations, siblingPositions } = placementOf(genealogy)

  return genealogy.persons.map(({ id }) => {
    const generationAxis = generations.get(id)
    const siblingAxis = siblingPositions.get(id)
    if (generationAxis === undefined || siblingAxis === undefined) {
      throw new Error(`位置が割り当てられていない: ${id}`)
    }

    return point(generationAxis, siblingAxis)
  })
}

/** 点が線分の内側（両端を除く）に乗っているか */
const isPiercedBy = (p: AbstractPoint, [a, b]: Segment): boolean => {
  const alongGeneration = b.generationAxis - a.generationAxis
  const alongSibling = b.siblingAxis - a.siblingAxis
  const toGeneration = p.generationAxis - a.generationAxis
  const toSibling = p.siblingAxis - a.siblingAxis

  if (alongGeneration * toSibling !== alongSibling * toGeneration) return false

  const projected = alongGeneration * toGeneration + alongSibling * toSibling
  return projected > 0 && projected < alongGeneration ** 2 + alongSibling ** 2
}

/** 兄弟バーの横線を、高さと区間にする。縦線である幹はここで落ちる */
const barSpansOf = (genealogy: Genealogy) =>
  segmentsOf(genealogy, 'siblingBar').flatMap(([a, b]) =>
    a.generationAxis === b.generationAxis
      ? [
          {
            height: a.generationAxis,
            from: Math.min(a.siblingAxis, b.siblingAxis),
            to: Math.max(a.siblingAxis, b.siblingAxis),
          },
        ]
      : [],
  )

/** familyId と線種で経路を引く。返る順序はそのまま保つ */
const pathsIn = (genealogy: Genealogy) => {
  const links = linksOf(genealogy)

  return (familyId: number, kind: LinkKind) =>
    links
      .filter((link) => link.familyId === familyId && link.kind === kind)
      .map(({ points }) => points)
}

/**
 * 1 と 2 の夫婦に、実子 3 と養子 4。
 * 4 の実親は判明しておらず、養親 family が主系統になる。
 * 養子リンクは世代制約に含まれないので、世代は generationOverride で与える。
 */
const adoptedIntoPrimaryFamily = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '志乃', sex: 'f' },
    { id: 3, familyName: '桐生', givenName: '春彦', sex: 'm' },
    { id: 4, familyName: '桐生', givenName: '夏彦', sex: 'm', generationOverride: 1 },
  ],
  families: [{ id: 1, partner1Id: 1, partner2Id: 2 }],
  familyChildren: [
    { familyId: 1, childId: 3, relationType: 'biological', siblingOrder: 0 },
    { familyId: 1, childId: 4, relationType: 'adopted', siblingOrder: 1 },
  ],
})

/**
 * 叔父の 2 と姪の 4 が婚姻し、子 5 を持つ。
 * 世代が1つずれるため婚姻線が斜めになり、family 3 の基点が両軸の中点に来る。
 */
const unclesMarriage = genealogySchema.parse({
  persons: [
    { id: 1, familyName: '桐生', givenName: '宗一郎', sex: 'm' },
    { id: 2, familyName: '桐生', givenName: '夏彦', sex: 'm' },
    { id: 3, familyName: '桐生', givenName: '春彦', sex: 'm' },
    { id: 4, familyName: '桐生', givenName: '真澄', sex: 'f' },
    { id: 5, familyName: '桐生', givenName: '冬樹', sex: 'm' },
  ],
  families: [
    { id: 1, partner1Id: 1, partner2Id: null },
    { id: 2, partner1Id: 3, partner2Id: null },
    { id: 3, partner1Id: 2, partner2Id: 4 },
  ],
  familyChildren: [
    { familyId: 1, childId: 2, siblingOrder: 0 },
    { familyId: 1, childId: 3, siblingOrder: 1 },
    { familyId: 2, childId: 4, siblingOrder: 0 },
    { familyId: 3, childId: 5, siblingOrder: 0 },
  ],
})

const samplePaths = pathsIn(sampleGenealogy)

describe('buildLinkPaths', () => {
  it('婚姻線は、2人の partner の点を直線で結ぶ', () => {
    const marriages = linksOf(simpleCouple).filter(({ kind }) => kind === 'marriage')

    expect(marriages).toEqual([
      {
        kind: 'marriage',
        shape: 'polyline',
        familyId: 1,
        points: [point(0, 0), point(0, 1)],
      },
    ])
  })

  it('partner が1人だけの family には、婚姻線を引かない', () => {
    expect(linksOf(singleParent).filter(({ kind }) => kind === 'marriage')).toEqual([])
  })

  it('幹は、婚姻線の中点から兄弟バーの高さまで降りる', () => {
    const bars = linksOf(simpleCouple).filter(({ kind }) => kind === 'siblingBar')

    expect(bars).toEqual([
      {
        kind: 'siblingBar',
        shape: 'polyline',
        familyId: 1,
        points: [point(0, 0.5), point(0.5, 0.5)],
      },
    ])
  })

  it('兄弟バーは、親の世代の1つ下の中間に、子の左端から右端までをまたいで置かれる', () => {
    // 五郎（1）は 0.5、子の梅（2）は 0、楠（3）は 1 に立つ
    expect(pathsIn(singleParent)(1, 'siblingBar')).toEqual([
      [point(0, 0.5), point(0.5, 0.5)],
      [point(0.5, 0), point(0.5, 1)],
    ])
  })

  it('世代の食い違う夫婦でも、幹の根本は斜めの婚姻線の上に乗る', () => {
    // family 3 は叔父（世代1・位置0）と姪（世代2・位置1）の婚姻。中点は世代 1.5・位置 0.5
    expect(pathsIn(unclesMarriage)(3, 'siblingBar')[0]).toEqual([point(1.5, 0.5), point(2.5, 0.5)])
  })

  it('子が片側に寄っていても、兄弟バーは幹の根本まで届く', () => {
    // family 3 は春彦（位置 1）と佳代（位置 2）の再婚。子の冬樹は位置 2 で、幹の根本より右にいる
    expect(samplePaths(3, 'siblingBar')).toEqual([
      [point(1, 1.5), point(1.5, 1.5)],
      [point(1.5, 1.5), point(1.5, 2)],
    ])
  })

  it('子が1人で幹の真下にいる family では、横線を返さない', () => {
    expect(samplePaths(4, 'siblingBar')).toEqual([[point(1, 4.5), point(1.5, 4.5)]])
  })

  it('実子への線は、兄弟バーの高さから子のノードへ降りる', () => {
    // family 2 の子は光一（位置 0）と真澄（位置 1）。バーは世代 1.5 に乗る
    expect(samplePaths(2, 'biological')).toEqual([
      [point(1.5, 0), point(2, 0)],
      [point(1.5, 1), point(2, 1)],
    ])
  })

  it('養親 family が主系統になる養子への線は、実子と同じ経路で線種だけが変わる', () => {
    const paths = pathsIn(adoptedIntoPrimaryFamily)

    expect(paths(1, 'biological')).toEqual([[point(0.5, 0), point(1, 0)]])
    expect(paths(1, 'adopted')).toEqual([[point(0.5, 1), point(1, 1)]])
  })

  it('主系統に含まれない親子は、family の基点から子へ3次ベジェ曲線で結ぶ', () => {
    // 実（12）は秋乃と信昌の実子であり、宗一郎の養子。養親側は主系統にならない
    expect(linksOf(sampleGenealogy).filter(({ shape }) => shape === 'curve')).toEqual([
      {
        kind: 'adopted',
        shape: 'curve',
        familyId: 1,
        childId: 12,
        points: [point(0, 2.5), point(0.5, 2.5), point(1.5, 4.5), point(2, 4.5)],
      },
    ])
  })

  it('双方が主系統を持ち隣り合わない夫婦でも、婚姻線は2点を直接結ぶ', () => {
    // family 6 は夏彦（世代1・位置3）と姪の真澄（世代2・位置1）の婚姻
    expect(samplePaths(6, 'marriage')).toEqual([[point(1, 3), point(2, 1)]])
  })

  it('婚姻線は、両端以外の人物のノードを通らない', () => {
    // 再婚した春彦の婚姻線が、初婚の千代のノードを貫かないこと
    const nodes = nodesOf(sampleGenealogy)
    const pierced = segmentsOf(sampleGenealogy, 'marriage').filter((marriage) =>
      nodes.some((node) => isPiercedBy(node, marriage)),
    )

    expect(pierced).toEqual([])
  })

  it('同じ高さに並ぶ兄弟バーの横線は、区間を共有しない', () => {
    // 初婚の子と再婚の子が、1本に繋がった横線にぶら下がらないこと
    const spans = barSpansOf(sampleGenealogy)
    const merged = spans.flatMap((span, index) =>
      spans
        .slice(index + 1)
        .filter(
          (other) =>
            span.height === other.height && span.from <= other.to && other.from <= span.to,
        ),
    )

    expect(merged).toEqual([])
  })

  it('子の居ない family には、幹も兄弟バーも返さない', () => {
    expect(samplePaths(6, 'siblingBar')).toEqual([])
  })

  it('1つの family の線は、婚姻線 → 幹 → 兄弟バー → 子 の順に返る', () => {
    const links = linksOf(sampleGenealogy).filter(({ familyId }) => familyId === 1)

    expect(links.map((link) => [link.kind, childIdOf(link)])).toEqual([
      ['marriage', null],
      ['siblingBar', null],
      ['siblingBar', null],
      ['biological', 3],
      ['biological', 4],
      ['biological', 5],
      ['adopted', 12],
    ])
  })

  it('子への線は、兄弟順に返る', () => {
    const links = linksOf(shuffledSiblings).filter(({ kind }) => kind === 'biological')

    expect(links.map(childIdOf)).toEqual([4, 2, 3])
  })

  it('線は family の ID 昇順に返る', () => {
    const familyIds = linksOf(sampleGenealogy).map(({ familyId }) => familyId)

    expect(familyIds).toEqual([...familyIds].sort((a, b) => a - b))
  })

  it('familyChildren の並び順を変えても、同じ結果になる', () => {
    const reversed = genealogySchema.parse({
      ...sampleGenealogy,
      familyChildren: [...sampleGenealogy.familyChildren].reverse(),
    })

    expect(linksOf(reversed)).toEqual(linksOf(sampleGenealogy))
  })
})

import { describe, expect, it } from 'vitest'

import { sampleGenealogy } from '../../fixtures/sample-genealogy'

import type { Segment } from './build-link-paths'
import { computeLayout, type LayoutNode } from './compute-layout'
import { GENERATION_PITCH, SIBLING_PITCH, type ScreenLink, type ScreenPoint } from './orientation'

/**
 * docs/design/layout-engine.md「テスト観点」の表に対応する。
 * 工程ごとのテストが通っていても、繋いだ結果が家系図として読めるとは限らない。
 *
 * 観点7（祖先ループ）だけはここに無い。レイアウト計算に渡る前に弾く仕事であり、
 * validate-genealogy-graph.test.ts が持つ。
 */

const layout = computeLayout(sampleGenealogy)

/** personId でノードを引く。落ちていたら例外にする */
const nodeOf = (personId: number): LayoutNode => {
  const found = layout.nodes.find(({ personId: id }) => id === personId)
  if (found === undefined) throw new Error(`ノードが無い: ${personId}`)
  return found
}

const xOf = (personId: number): number => nodeOf(personId).x
const yOf = (personId: number): number => nodeOf(personId).y

/** 線種で直線の経路を集める。曲線は含めない */
const segmentsOf = (kind: ScreenLink['kind']): Segment<ScreenPoint>[] =>
  layout.links.flatMap((link) =>
    link.kind === kind && link.shape === 'polyline' ? [link.points] : [],
  )

/** 点が線分の内側（両端を除く）に乗っているか */
const isPiercedBy = (p: ScreenPoint, [a, b]: Segment<ScreenPoint>): boolean => {
  const alongX = b.x - a.x
  const alongY = b.y - a.y
  const toX = p.x - a.x
  const toY = p.y - a.y

  if (alongX * toY !== alongY * toX) return false

  const projected = alongX * toX + alongY * toY
  return projected > 0 && projected < alongX ** 2 + alongY ** 2
}

/** 順序を問わない組み合わせ */
const pairsOf = <T>(items: T[]): [T, T][] =>
  items.flatMap((item, index) => items.slice(index + 1).map((other): [T, T] => [item, other]))

describe('computeLayout', () => {
  it('直系の3世代は、世代の距離だけ離れた3段に並ぶ', () => {
    // 宗一郎（1）→ 春彦（3）→ 光一（7）
    expect([1, 3, 7].map(yOf)).toEqual([0, GENERATION_PITCH, GENERATION_PITCH * 2])
  })

  it('再婚した人物は配偶者に挟まれ、子は婚姻ごとに固まって並ぶ', () => {
    // 春彦（3）の初婚が千代（6）、再婚が佳代（9）
    expect([6, 3, 9].map(xOf)).toEqual([0, SIBLING_PITCH, SIBLING_PITCH * 2])

    // 初婚の子は光一（7）と真澄（8）、再婚の子は冬樹（10）
    expect(Math.max(xOf(7), xOf(8))).toBeLessThan(xOf(10))
  })

  it('養子は実親からの実線と養親からの点線を持ち、世代は血縁側で決まる', () => {
    // 実（12）は秋乃と信昌（family 4）の実子であり、宗一郎（family 1）の養子
    const links = layout.links.filter((link) => 'childId' in link && link.childId === 12)

    expect(links.map(({ familyId, kind }) => [familyId, kind])).toEqual([
      [1, 'adopted'],
      [4, 'biological'],
    ])

    // 養親経由なら世代1。血縁経由の2に決まる
    expect(yOf(12)).toBe(GENERATION_PITCH * 2)
  })

  it('片親しか判明していない family でも、子は親の1つ下の段に並ぶ', () => {
    // 立花家（family 5）は母が判明しておらず partner2Id が null
    const below = yOf(13) + GENERATION_PITCH

    expect([14, 15].map(yOf)).toEqual([below, below])
    expect(xOf(15)).toBe(xOf(14) + SIBLING_PITCH)
  })

  it('連結していない複数のルートは、横に並んで重ならない', () => {
    const tachibana = [13, 14, 15]
    const kiryu = sampleGenealogy.persons
      .map(({ id }) => id)
      .filter((id) => !tachibana.includes(id))

    expect(Math.max(...kiryu.map(xOf))).toBeLessThan(Math.min(...tachibana.map(xOf)))
  })

  it('世代の矛盾する婚姻があっても、例外を投げず診断に積む', () => {
    // family 6 は夏彦（4）と姪の真澄（8）の婚姻
    expect(layout.diagnostics).toEqual([
      { kind: 'marriageConflict', familyId: 6, partner1Id: 4, partner2Id: 8 },
    ])
  })

  it('全ての人物がノードを持つ', () => {
    expect(layout.nodes.map(({ personId }) => personId)).toEqual(
      sampleGenealogy.persons.map(({ id }) => id),
    )
  })

  it('同じ家系を2回渡すと、完全に同じ出力になる', () => {
    expect(computeLayout(sampleGenealogy)).toEqual(computeLayout(sampleGenealogy))
  })

  it('ノードは互いに1ピッチ以上離れ、矩形が交差しない', () => {
    // ノードの寸法はレイアウトエンジンの管轄外。ピッチいっぱいまで広がりうるものとして、
    // どちらかの軸で必ず1ピッチ空いていることを見る
    const overlapping = pairsOf(layout.nodes).filter(
      ([a, b]) => Math.abs(a.x - b.x) < SIBLING_PITCH && Math.abs(a.y - b.y) < GENERATION_PITCH,
    )

    expect(overlapping).toEqual([])
  })

  it('婚姻線は、両端以外の人物のノードを通らない', () => {
    const pierced = segmentsOf('marriage').filter((marriage) =>
      layout.nodes.some((node) => isPiercedBy(node, marriage)),
    )

    expect(pierced).toEqual([])
  })

  it('同じ高さに並ぶ兄弟バーの横線は、区間を共有しない', () => {
    // 縦線である幹はここで落ちる
    const spans = segmentsOf('siblingBar').flatMap(([a, b]) =>
      a.y === b.y ? [{ y: a.y, from: Math.min(a.x, b.x), to: Math.max(a.x, b.x) }] : [],
    )

    const merged = pairsOf(spans).filter(
      ([span, other]) => span.y === other.y && span.from <= other.to && other.from <= span.to,
    )

    expect(merged).toEqual([])
  })
})

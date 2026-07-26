import { describe, expect, it } from 'vitest'

import type { LayoutLink } from './build-link-paths'
import { orientLinks, topToBottom, GENERATION_PITCH, SIBLING_PITCH } from './orientation'

const point = (generationAxis: number, siblingAxis: number) => ({ generationAxis, siblingAxis })

describe('上→下の向き変換', () => {
  it('世代が1つ下がると、y が世代間の距離だけ増える', () => {
    expect(topToBottom(point(3, 0))).toEqual({ x: 0, y: 3 * GENERATION_PITCH })
  })

  it('兄弟軸が1つ進むと、x が兄弟間の距離だけ増える', () => {
    expect(topToBottom(point(0, 2))).toEqual({ x: 2 * SIBLING_PITCH, y: 0 })
  })

  it('兄弟バーが乗る半端な世代軸も、比例して変換される', () => {
    expect(topToBottom(point(1.5, -0.5))).toEqual({
      x: -0.5 * SIBLING_PITCH,
      y: 1.5 * GENERATION_PITCH,
    })
  })
})

describe('結線への向き変換の適用', () => {
  it('直線は2点のまま、両端が画面座標になる', () => {
    const marriage: LayoutLink = {
      kind: 'marriage',
      shape: 'polyline',
      points: [point(1, 0), point(1, 1)],
      familyId: 1,
    }

    expect(orientLinks([marriage], topToBottom)).toEqual([
      {
        kind: 'marriage',
        shape: 'polyline',
        points: [
          { x: 0, y: GENERATION_PITCH },
          { x: SIBLING_PITCH, y: GENERATION_PITCH },
        ],
        familyId: 1,
      },
    ])
  })

  it('3次ベジェは、制御点も含めた4点が変換される', () => {
    const curve: LayoutLink = {
      kind: 'adopted',
      shape: 'curve',
      points: [point(0, 0), point(0.5, 0), point(0.5, 1), point(1, 1)],
      familyId: 2,
      childId: 7,
    }

    expect(orientLinks([curve], topToBottom)).toEqual([
      {
        kind: 'adopted',
        shape: 'curve',
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 0.5 * GENERATION_PITCH },
          { x: SIBLING_PITCH, y: 0.5 * GENERATION_PITCH },
          { x: SIBLING_PITCH, y: GENERATION_PITCH },
        ],
        familyId: 2,
        childId: 7,
      },
    ])
  })
})

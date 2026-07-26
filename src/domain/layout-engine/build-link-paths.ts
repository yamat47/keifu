import { childrenByFamily, partnerIdsOf, type FamilyChild, type Genealogy } from '../models'

import type { SiblingPositions } from './assign-sibling-positions'
import type { PrimaryFamilies } from './select-primary-families'

/** 抽象座標の1点。画面座標への変換は orientation adapter が行う */
export type AbstractPoint = { generationAxis: number; siblingAxis: number }

/** 親子線の線種。続柄がそのまま線種になるので、data-model 側に従属させる */
export type ChildLinkKind = FamilyChild['relationType']

export type LinkKind = ChildLinkKind | 'marriage' | 'siblingBar'

/** 婚姻線・幹・横線・親子線は、どれも2点で決まる */
export type Segment = readonly [AbstractPoint, AbstractPoint]

/** 3次ベジェ。始点・制御点2つ・終点 */
export type CubicBezier = readonly [AbstractPoint, AbstractPoint, AbstractPoint, AbstractPoint]

/**
 * 線種ごとに持てる形を型で分けている。全リンクを1つの形にすると、描画側が
 * 「兄弟バーの childId」や「直線の3点目」という有り得ない値を毎回捌くことになる。
 */
export type LayoutLink =
  | { kind: 'marriage' | 'siblingBar'; shape: 'polyline'; points: Segment; familyId: number }
  | { kind: ChildLinkKind; shape: 'polyline'; points: Segment; familyId: number; childId: number }
  | { kind: ChildLinkKind; shape: 'curve'; points: CubicBezier; familyId: number; childId: number }

/** 1〜3 の工程が確定させた配置 */
export type Placement = {
  generations: Map<number, number>
  siblingPositions: SiblingPositions
  primaryFamilies: PrimaryFamilies
}

/** 兄弟バーが乗る世代軸を、親の世代からどれだけ下げるか */
const SIBLING_BAR_OFFSET = 0.5

/** ベジェの制御点を、両端の点から世代軸方向へどれだけ引くか */
const CURVE_CONTROL_OFFSET = 0.5

const midpointOf = (a: AbstractPoint, b: AbstractPoint): AbstractPoint => ({
  generationAxis: (a.generationAxis + b.generationAxis) / 2,
  siblingAxis: (a.siblingAxis + b.siblingAxis) / 2,
})

/**
 * 配置の確定した家系から、線種ごとの経路を求める。
 * 仕様の正は docs/design/layout-engine.md「4. 結線パス生成」
 *
 * 参照整合性は前提とする。`validateGenealogyGraph` を通っていない家系を渡すと、
 * 収録されていない人物を指す線は黙って落ちる。
 */
export function buildLinkPaths(
  genealogy: Genealogy,
  { generations, siblingPositions, primaryFamilies }: Placement,
): LayoutLink[] {
  const pointOf = (personId: number): AbstractPoint | undefined => {
    const generationAxis = generations.get(personId)
    const siblingAxis = siblingPositions.get(personId)
    if (generationAxis === undefined || siblingAxis === undefined) return undefined

    return { generationAxis, siblingAxis }
  }

  const childrenOfFamily = childrenByFamily(genealogy)

  return [...genealogy.families]
    .sort((a, b) => a.id - b.id)
    .flatMap((family): LayoutLink[] => {
      const familyId = family.id
      const partnerPoints = partnerIdsOf(family)
        .map(pointOf)
        .filter((point) => point !== undefined)

      const [first, second] = partnerPoints
      if (first === undefined) return []

      // partner が1人だけの family では、その人物の点がそのまま基点になる
      const anchor = second === undefined ? first : midpointOf(first, second)
      const barGenerationAxis =
        Math.max(...partnerPoints.map(({ generationAxis }) => generationAxis)) + SIBLING_BAR_OFFSET
      const onBar = (siblingAxis: number): AbstractPoint => ({
        generationAxis: barGenerationAxis,
        siblingAxis,
      })

      const children = (childrenOfFamily.get(familyId) ?? []).flatMap(
        ({ childId, relationType }) => {
          const point = pointOf(childId)
          if (point === undefined) return []

          return [
            { childId, kind: relationType, point, isPrimary: primaryFamilies.get(childId) === familyId },
          ]
        },
      )
      const primaryChildAxes = children
        .filter(({ isPrimary }) => isPrimary)
        .map(({ point }) => point.siblingAxis)

      const marriage: LayoutLink[] =
        second === undefined
          ? []
          : [{ kind: 'marriage', shape: 'polyline', points: [first, second], familyId }]

      return [
        ...marriage,
        ...siblingBarsOf(anchor, primaryChildAxes, onBar).map(
          (points): LayoutLink => ({ kind: 'siblingBar', shape: 'polyline', points, familyId }),
        ),
        ...children.map(({ childId, kind, point, isPrimary }): LayoutLink =>
          isPrimary
            ? { kind, shape: 'polyline', points: [onBar(point.siblingAxis), point], familyId, childId }
            : { kind, shape: 'curve', points: curveTo(anchor, point), familyId, childId },
        ),
      ]
    })
}

/** 幹と横線。SVG の1本の path では T 字を描けないので2本に分けて返す */
function siblingBarsOf(
  anchor: AbstractPoint,
  childAxes: number[],
  onBar: (siblingAxis: number) => AbstractPoint,
): Segment[] {
  if (childAxes.length === 0) return []

  const stem: Segment = [anchor, onBar(anchor.siblingAxis)]

  // 横線は幹の根本もまたぐ。子が全員片側に寄っている family で、横線が幹に届かなくなる
  const spanned = [anchor.siblingAxis, ...childAxes]
  const left = Math.min(...spanned)
  const right = Math.max(...spanned)

  return left === right ? [stem] : [stem, [onBar(left), onBar(right)]]
}

/**
 * 制御点を世代軸方向にだけ引く。3次ベジェはアフィン変換で不変なので、制御点も
 * ただの点として orientation adapter に渡せば、向きを変えても形が保たれる。
 */
const curveTo = (from: AbstractPoint, to: AbstractPoint): CubicBezier => [
  from,
  { ...from, generationAxis: from.generationAxis + CURVE_CONTROL_OFFSET },
  { ...to, generationAxis: to.generationAxis - CURVE_CONTROL_OFFSET },
  to,
]

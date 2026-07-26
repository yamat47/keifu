import type { AbstractPoint, CubicBezier, LayoutLink, Segment } from './build-link-paths'

/** 画面座標の1点 */
export type ScreenPoint = { x: number; y: number }

/**
 * 抽象座標を画面座標に変換する。向きを変えるときはこの関数だけを差し替える。
 * 仕様の正は docs/design/layout-engine.md「5. 座標変換」
 */
export type Orientation = (point: AbstractPoint) => ScreenPoint

/** 画面座標に変換済みの結線 */
export type ScreenLink = LayoutLink<ScreenPoint>

// 世代のほうを広く取る。人名を縦書きにするのでノードは世代軸方向に長くなり、
// 等間隔にすると段どうしが詰まって、婚姻線と兄弟バーが見分けられなくなる。

/** 世代がひとつ進むあいだの距離 */
export const GENERATION_PITCH = 200

/** 同世代で隣り合う人物のあいだの距離 */
export const SIBLING_PITCH = 80

/** 上から下へ世代が進む向き。現時点で唯一の実装 */
export const topToBottom: Orientation = ({ generationAxis, siblingAxis }) => ({
  x: siblingAxis * SIBLING_PITCH,
  y: generationAxis * GENERATION_PITCH,
})

/** 結線の経路を画面座標に移す。線種・family・子の personId はそのまま持ち越す */
export function orientLinks(
  links: readonly LayoutLink[],
  orientation: Orientation,
): ScreenLink[] {
  return links.map((link) =>
    link.shape === 'curve'
      ? { ...link, points: orientCurve(link.points, orientation) }
      : { ...link, points: orientSegment(link.points, orientation) },
  )
}

// 形ごとに変換関数を分ける。1つにまとめて points.map() で回すと戻り値が可変長配列になり、
// 2点/4点を型で固定した意味が失われる。
const orientSegment = ([from, to]: Segment, orientation: Orientation): Segment<ScreenPoint> => [
  orientation(from),
  orientation(to),
]

const orientCurve = (
  [from, fromControl, toControl, to]: CubicBezier,
  orientation: Orientation,
): CubicBezier<ScreenPoint> => [
  orientation(from),
  orientation(fromControl),
  orientation(toControl),
  orientation(to),
]

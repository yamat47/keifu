/**
 * レイアウトエンジンの公開面。**外から呼べるのは `computeLayout` だけ。**
 *
 * 工程ごとの関数（世代割当・主系統の抽出・横位置計算・結線パス生成）は出さない。
 * 出すと features が途中の工程を直接呼べてしまい、「描画側が知るのはこの関数だけ」
 * という前提が lint でも型でも守られなくなる
 * → docs/design/layout-engine.md「責務」
 */
export type { GenerationDiagnostic } from './assign-generations'
export type { ChildLinkKind, CubicBezier, LinkKind, Segment } from './build-link-paths'
export { computeLayout, type Layout, type LayoutNode } from './compute-layout'
export { GENERATION_PITCH, SIBLING_PITCH, type ScreenLink, type ScreenPoint } from './orientation'

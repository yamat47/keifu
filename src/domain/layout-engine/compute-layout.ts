import type { Genealogy } from '../models'

import { assignGenerations, type GenerationDiagnostic } from './assign-generations'
import { assignSiblingPositions } from './assign-sibling-positions'
import { buildLinkPaths } from './build-link-paths'
import { orientLinks, topToBottom, type ScreenLink } from './orientation'
import { selectPrimaryFamilies } from './select-primary-families'

/** 画面座標に置かれた1人 */
export type LayoutNode = { personId: number; x: number; y: number }

export type Layout = {
  nodes: LayoutNode[]
  links: ScreenLink[]
  diagnostics: GenerationDiagnostic[]
}

/**
 * 家系から家系図の座標を求める。**描画側が呼ぶのはこの関数だけ。**
 * 仕様の正は docs/design/layout-engine.md「責務」
 *
 * グラフ検証は含まない。参照整合性を欠いた家系を渡すと、収録されていない
 * 人物を指す線は黙って落ちる。描画の前に `validateGenealogyGraph` を通すこと。
 */
export function computeLayout(genealogy: Genealogy): Layout {
  const { generations, diagnostics } = assignGenerations(genealogy)
  const primaryFamilies = selectPrimaryFamilies(genealogy)
  const siblingPositions = assignSiblingPositions(genealogy, primaryFamilies)

  const nodes = genealogy.persons.map(({ id }): LayoutNode => {
    const generationAxis = generations.get(id)
    const siblingAxis = siblingPositions.get(id)

    // 収録されている人物には必ず位置が付く。付かなければレイアウトエンジンの
    // 不具合であり、その人物を黙って落とすと図の辻褄が合ったまま1人消える
    if (generationAxis === undefined || siblingAxis === undefined) {
      throw new Error(`位置が割り当てられていない: ${id}`)
    }

    return { personId: id, ...topToBottom({ generationAxis, siblingAxis }) }
  })

  const links = orientLinks(
    buildLinkPaths(genealogy, { generations, siblingPositions, primaryFamilies }),
    topToBottom,
  )

  return { nodes, links, diagnostics }
}

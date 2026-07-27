import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

import { sampleGenealogy } from '../../fixtures/sample-genealogy'
import { tokens } from '../tokens'

import { NODE_HEIGHT, NODE_WIDTH, PersonNode } from './PersonNode'

/**
 * 人物のノード。design-system.md「ノードの寸法」以下が仕様の正。
 *
 * 見たいのは、続柄の有無で人名の大きさが変わらないこと・背後を通る結線が
 * 人名を貫かないこと・長い名前がノードからはみ出さないことの3つ。
 * どれも assert より目で見るほうが早い。
 */
const meta = {
  title: 'tree/PersonNode',
  component: PersonNode,
} satisfies Meta<typeof PersonNode>

export default meta

// 実寸で見たいのでレイアウトエンジンのピッチに揃える。design-system は domain を
// import できないので値を写している
// （SIBLING_PITCH = 80 → src/domain/layout-engine/orientation.ts）
const SIBLING_PITCH = 80

/** ノードの端が SVG の端で切れないよう逃がす */
const MARGIN = 16

const ROW_HEIGHT = NODE_HEIGHT + MARGIN * 2
const ROW_CENTER_Y = MARGIN + NODE_HEIGHT / 2
const rowWidth = (count: number) => SIBLING_PITCH * count + MARGIN * 2

/** index 番目の列の中心。ノードはピッチの真ん中に置かれる */
const columnX = (index: number) => MARGIN + SIBLING_PITCH * (index + 0.5)

// 人名はサンプル家系から引く。書き写すと、フィクスチャを直したときに
// Storybook だけが古い家系を描き続ける → design-system.md「Storybook」
const namesById = new Map(
  sampleGenealogy.persons.map(({ id, familyName, givenName }) => [
    id,
    `${familyName}${givenName}`,
  ]),
)
const nameOf = (id: number) => namesById.get(id) ?? ''

function Paper({
  width,
  height,
  children,
}: {
  width: number
  height: number
  children: ReactNode
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ background: tokens.color.washi }}
    >
      {children}
    </svg>
  )
}

/**
 * 続柄のある人物と無い人物を並べる。ルートの人物には続柄が付かない。
 * 人名の大きさが5人とも同じであること、続柄が無くても帯が空いたままであることを見る
 * → design-system.md「続柄が無い人物でも帯は空ける」
 *
 * 続柄はフィクスチャに無い。構造から導出するものなのでここでは手で添える
 * → design-system.md「続柄はノードが導出しない」
 */
export const 人名と続柄: StoryObj = {
  render: () => {
    const people = [
      { id: 3, kinshipTerm: '長男' },
      { id: 4, kinshipTerm: '二男' },
      { id: 5, kinshipTerm: '長女' },
      { id: 12, kinshipTerm: '養子' },
      { id: 1, kinshipTerm: null },
    ]

    return (
      <Paper width={rowWidth(people.length)} height={ROW_HEIGHT}>
        {people.map(({ id, kinshipTerm }, index) => (
          <PersonNode
            key={id}
            name={nameOf(id)}
            kinshipTerm={kinshipTerm}
            x={columnX(index)}
            y={ROW_CENTER_Y}
          />
        ))}
      </Paper>
    )
  },
}

/**
 * 結線の端点はノードの中心にある（layout-engine.md「人物は点として扱う」）ので、
 * 線は人名の上を通る。ノードの塗りがそれを隠し、名前の周りだけ線が途切れる
 * → design-system.md「ノードは枠で囲わず、地色で結線を隠す」
 *
 * 2人のあいだに線が見えたままであることも同時に確かめる。ここが埋まるようなら
 * ノードがピッチに対して大きすぎる。
 *
 * 引いているのは意味を持たないただの直線。婚姻線や親子の線をここで組み立てると、
 * MarriageLink / ChildLink ができたときに同じ絵が2箇所に残る。塗りが線を隠すことは
 * 交差する線1本で見える。
 */
export const 結線の上に置く: StoryObj = {
  render: () => {
    const people = [
      { id: 3, kinshipTerm: '長男' },
      { id: 6, kinshipTerm: null },
    ]

    const stroke = {
      stroke: tokens.line.relationColor,
      strokeWidth: tokens.line.relationWidth,
    }

    return (
      <Paper width={rowWidth(people.length)} height={ROW_HEIGHT}>
        <line
          x1={columnX(0)}
          y1={ROW_CENTER_Y}
          x2={columnX(people.length - 1)}
          y2={ROW_CENTER_Y}
          style={stroke}
        />
        {people.map(({ id }, index) => (
          <line
            key={id}
            x1={columnX(index)}
            y1={0}
            x2={columnX(index)}
            y2={ROW_CENTER_Y}
            style={stroke}
          />
        ))}

        {people.map(({ id, kinshipTerm }, index) => (
          <PersonNode
            key={id}
            name={nameOf(id)}
            kinshipTerm={kinshipTerm}
            x={columnX(index)}
            y={ROW_CENTER_Y}
          />
        ))}
      </Paper>
    )
  },
}

/**
 * 想定は2〜6文字（design-system.md「縦書きテキスト」）。それを超える名前は
 * `VerticalName` が字送りを詰めて収める。文字の大きさは変わらない。
 *
 * 想定を超える長さはフィクスチャに無いので、最後の1つだけ架空の名前を置く。
 */
export const 長い人名: StoryObj = {
  render: () => {
    const names = [nameOf(12), nameOf(1), '桐生宗一郎左衛門']

    return (
      <Paper width={rowWidth(names.length)} height={ROW_HEIGHT}>
        {names.map((name, index) => (
          <g key={name}>
            {/* ノードの輪郭は地色なので見えない。はみ出しは枠との関係でしか
                分からないので、確認用の目印をここだけ引く。太さを直接書くのは
                目印が家系図の一部ではないため。続柄の線のトークンを流用すると、
                線種がそのまま意味を表すという核が崩れる */}
            <rect
              x={columnX(index) - NODE_WIDTH / 2}
              y={MARGIN}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              fill="none"
              stroke={tokens.color.kin}
              strokeWidth={1}
            />
            <PersonNode
              name={name}
              kinshipTerm="長男"
              x={columnX(index)}
              y={ROW_CENTER_Y}
            />
          </g>
        ))}
      </Paper>
    )
  },
}

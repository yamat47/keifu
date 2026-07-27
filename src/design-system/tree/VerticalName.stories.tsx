import type { Meta, StoryObj } from '@storybook/react-vite'

import { sampleGenealogy } from '../../fixtures/sample-genealogy'
import { tokens } from '../tokens'

import { VerticalName } from './VerticalName'

/**
 * 人名の縦書き。design-system.md「縦書きテキスト」が仕様の正。
 *
 * 見たいのは、字が縦一列に並ぶこと・字送りが詰まっても字の大きさが変わらないこと・
 * 持ち分からはみ出さないことの3つ。どれも assert より目で見るほうが早い。
 */
const meta = {
  title: 'tree/VerticalName',
  component: VerticalName,
} satisfies Meta<typeof VerticalName>

export default meta

// 実際の持ち分で読めるかを見たいので、レイアウトエンジンのピッチに揃える。
// design-system は domain を import できないので値を写している
// （SIBLING_PITCH = 80 / GENERATION_PITCH = 200 → src/domain/layout-engine/orientation.ts）。
// PersonNode がピッチの中で名前に何を割り当てるかを決めたら、その値に合わせ直す
const CELL_WIDTH = 80
const ROOM_HEIGHT = 140
const FONT_SIZE = 22

/** 枠の線が SVG の端で半分に切れないよう、上下左右に逃がす */
const MARGIN = 8

/** 文字数の違いが見えるよう、長さの異なる人名をサンプル家系から1つずつ採る */
const NAMES = [
  ...new Map(
    sampleGenealogy.persons.map((person) => {
      const name = `${person.familyName}${person.givenName}`
      return [[...name].length, name] as const
    }),
  ),
]
  .sort(([a], [b]) => a - b)
  .map(([, name]) => name)

const CANVAS_WIDTH = CELL_WIDTH * NAMES.length + MARGIN * 2
const CANVAS_HEIGHT = ROOM_HEIGHT + MARGIN * 2

/**
 * 持ち分を枠で描く。はみ出しは枠との関係でしか見えず、名前だけを見ても
 * 収まっているのか偶然そう見えているだけなのか区別が付かない。
 */
function NameRoom({ maxHeight }: { maxHeight: number }) {
  return (
    <svg
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      style={{ background: tokens.color.washi }}
    >
      {NAMES.map((name, index) => {
        const left = MARGIN + CELL_WIDTH * index

        return (
          <g key={name}>
            {/* 枠は目印であって家系図の一部ではないので、続柄の線のトークンを流用しない。
                太さを直接書く理由は tokens.stories.tsx の色見本と同じ */}
            <rect
              x={left}
              y={MARGIN + (ROOM_HEIGHT - maxHeight) / 2}
              width={CELL_WIDTH}
              height={maxHeight}
              fill="none"
              stroke={tokens.color.kin}
              strokeWidth={1}
            />
            <VerticalName
              text={name}
              x={left + CELL_WIDTH / 2}
              y={MARGIN + ROOM_HEIGHT / 2}
              fontSize={FONT_SIZE}
              maxHeight={maxHeight}
            />
          </g>
        )
      })}
    </svg>
  )
}

/** 持ち分に余裕がある場合。字送りは文字の大きさと同じになる */
export const 収まる長さ: StoryObj = {
  render: () => <NameRoom maxHeight={ROOM_HEIGHT} />,
}

/**
 * 持ち分を縮めた場合。長い名前ほど字送りが詰まり、短い名前は詰まらない。
 * 字の大きさはどの名前も変わらない → design-system.md「収まらないときは字送りだけを詰める」
 *
 * 詰まった名前は字面が枠から上下に1〜2px 出る。これは想定どおりで、詰め幅を
 * em ボックスで決めているため（同節「「収まる」の基準は em ボックス」）。
 * ここで見たいのはむしろ、詰めきると字が重なって読めなくなること。
 * PersonNode がどこまで持ち分を削れるかの下限がこれで見える
 */
export const 収まらない長さ: StoryObj = {
  render: () => <NameRoom maxHeight={72} />,
}

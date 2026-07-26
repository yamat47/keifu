import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'

// 値ファイルではなくバレルから取る。バレルが tokens.css を随伴させるので、
// これだけで var() が解決する状態になる → design-system.md「値は CSS が持ち、TS は名前だけを持つ」
import { tokens } from '.'

/**
 * トークン一覧。design-system.md「Storybook」が置くことを定めている可視化。
 *
 * 対応表を手で書かない。tokens から列挙するので、トークンが増えれば勝手に載る。
 * 手書きの一覧にすると、追加したトークンが載らないまま気づかれない。
 */
const meta = {
  title: 'tokens/一覧',
} satisfies Meta

export default meta

/** 縦に積むだけの器。design-system/layouts の Stack ができたら差し替える */
function Rows({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.space[3],
        fontFamily: tokens.font.body,
        color: tokens.color.ink,
      }}
    >
      {children}
    </div>
  )
}

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.space[3] }}>
      <code style={{ width: tokens.space[6], flex: '0 0 auto' }}>{name}</code>
      {children}
    </div>
  )
}

export const 色: StoryObj = {
  render: () => (
    <Rows>
      {Object.entries(tokens.color).map(([name, value]) => (
        <Row key={name} name={name}>
          <div
            style={{
              width: tokens.space[6],
              height: tokens.space[5],
              background: value,
              // 1px を直接書いている。washi が背景と同色に近く輪郭が無いと見えないが、
              // ヘアライン用のトークンは無い。--stroke-width-relation は SVG の
              // 続柄の線のためのもので、見本の枠に流用すると意味がずれる
              border: `1px solid ${tokens.color.inkSoft}`,
            }}
          />
          <code>{value}</code>
        </Row>
      ))}
    </Rows>
  ),
}

/**
 * 書体だけを見る。文字サイズは指定しない。design-system.md はフォントサイズの
 * トークンを定めていないので、余白スケールを流用すると余白の調整で
 * 見本の大きさが動く。
 */
export const タイポグラフィ: StoryObj = {
  render: () => (
    <Rows>
      <Row name="display">
        <span style={{ fontFamily: tokens.font.display }}>源頼朝</span>
      </Row>
      <Row name="body">
        <span style={{ fontFamily: tokens.font.body }}>人物を追加する</span>
      </Row>
    </Rows>
  ),
}

/**
 * 線種がそのまま家系図の意味を表すので、ここが凡例の原型になる。
 * MarriageLink / ChildLink / Legend ができたらそれらを描く形に差し替える。
 */
export const 線: StoryObj = {
  render: () => (
    <Rows>
      <Row name="実子">
        <LineSample dash={tokens.line.biologicalDash} offsets={[0]} />
      </Row>
      <Row name="養子">
        <LineSample dash={tokens.line.adoptedDash} offsets={[0]} />
      </Row>
      <Row name="婚姻">
        <LineSample dash={tokens.line.biologicalDash} offsets={[-1, 1]} />
      </Row>
    </Rows>
  ),
}

const SAMPLE_WIDTH = 120
const SAMPLE_HEIGHT = 16

/**
 * 線トークンは属性ではなく style で当てる。stroke-dasharray="var(--dash-adopted)"
 * のようなプレゼンテーション属性は CSS ではないので var() が解決せず、
 * 無言で線が消える。tree/ 配下のコンポーネントもこの形に揃える。
 *
 * offsets は --marriage-gap の倍数。2本渡すと二重線になるのが婚姻で、
 * SVG に border: double に相当するものが無いためこの形を採る
 * → design-system.md「線トークンが CSS の border 記法ではない理由」
 * gap は単位なしの数値なので px を掛ける。SVG 要素への CSS transform の
 * px はユーザー座標と一致する。
 */
function LineSample({ dash, offsets }: { dash: string; offsets: readonly number[] }) {
  const midY = SAMPLE_HEIGHT / 2

  return (
    <svg
      width={SAMPLE_WIDTH}
      height={SAMPLE_HEIGHT}
      viewBox={`0 0 ${SAMPLE_WIDTH} ${SAMPLE_HEIGHT}`}
    >
      {offsets.map((offset) => (
        <line
          key={offset}
          x1={0}
          y1={midY}
          x2={SAMPLE_WIDTH}
          y2={midY}
          style={{
            stroke: tokens.line.relationColor,
            strokeWidth: tokens.line.relationWidth,
            strokeDasharray: dash,
            transform: `translateY(calc(${tokens.line.marriageGap} * ${offset}px))`,
          }}
        />
      ))}
    </svg>
  )
}

export const 余白: StoryObj = {
  render: () => (
    <Rows>
      {Object.entries(tokens.space).map(([step, value]) => (
        <Row key={step} name={`space-${step}`}>
          <div style={{ width: value, height: tokens.space[3], background: tokens.color.kin }} />
          <code>{value}</code>
        </Row>
      ))}
    </Rows>
  ),
}

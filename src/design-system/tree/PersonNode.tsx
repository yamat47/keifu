import { tokens } from '../tokens'

import { VerticalName } from './VerticalName'

// レイアウトエンジンのピッチ（SIBLING_PITCH = 80 / GENERATION_PITCH = 200
// → src/domain/layout-engine/orientation.ts）を超えない。超えるとエンジンのテストが
// 緑のままノードが重なる。差がそのまま結線の見える隙間になる。
// design-system は domain を import できないので値を写している。
// ピッチを変えたらここも見直す → design-system.md「ノードの寸法」

/** ノードの幅 */
export const NODE_WIDTH = 48
/** ノードの高さ */
export const NODE_HEIGHT = 150

/** 字送りを詰めずに縦に並ぶ文字数。想定する人名の長さの上限 */
const NAME_CAPACITY = 6

/** 続柄の文字の大きさ。人名に対する比 */
const TERM_SCALE = 0.5

/** 続柄とその上下の余白を合わせた帯の高さ。人名に対する比 */
const TERM_BAND_SCALE = TERM_SCALE * 1.5

// 字面は em ボックスより上下に出る。serif の 22px で 25.5px を実測した
// → design-system.md「「収まる」の基準は em ボックス」
const GLYPH_OVERSHOOT = 25.5 / 22 - 1

// 高さから逆算する。固定値で持つとピッチを変えたときに人名だけが追従せず、
// 持ち分からはみ出す → design-system.md「人名の大きさはノードの高さから決まる」
const FONT_SIZE = NODE_HEIGHT / (TERM_BAND_SCALE + NAME_CAPACITY + GLYPH_OVERSHOOT)
const TERM_FONT_SIZE = FONT_SIZE * TERM_SCALE
const TERM_BAND = FONT_SIZE * TERM_BAND_SCALE

/** 人名が使ってよい縦の長さ。字面のはみ出しは含めない */
const NAME_ROOM = FONT_SIZE * NAME_CAPACITY

// props に依らないので毎回作らない。50人ぶんが再描画されるたびに捨てられる
const PLATE_STYLE = { fill: tokens.color.washi }
const TERM_STYLE = {
  fontFamily: tokens.font.display,
  fontSize: TERM_FONT_SIZE,
  fill: tokens.color.inkSoft,
}

type PersonNodeProps = {
  /** 人名。姓と名を連ねたもの */
  name: string
  /**
   * 続柄。ルートの人物のように付かない場合は null。
   *
   * 養子は実親 family と養親 family で別の続柄を持ち、人物ごとに1つに決まらない。
   * どれを出すかは接続層が決める → design-system.md「続柄はノードが導出しない」
   */
  kinshipTerm: string | null
  /** ノードの中心。レイアウトエンジンが返す人物の点 */
  x: number
  y: number
}

/**
 * 人物ひとりぶんの短冊 → design-system.md「ノードの寸法」以下
 *
 * 続柄が無くても帯は空ける。有無で人名の大きさが変わると、同じ世代に並んだときに
 * 名前の重みが違って見える。
 */
export function PersonNode({ name, kinshipTerm, x, y }: PersonNodeProps) {
  const top = y - NODE_HEIGHT / 2

  return (
    <g>
      {/* 輪郭を持たず地色で塗るだけ。結線の端点はノードの中心にあるので、
          この塗りが線を隠すことで人名の周りだけ線が途切れる
          → design-system.md「ノードは枠で囲わず、地色で結線を隠す」 */}
      <rect
        x={x - NODE_WIDTH / 2}
        y={top}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        style={PLATE_STYLE}
      />

      {kinshipTerm !== null && (
        <text
          x={x}
          y={top + TERM_BAND / 2}
          textAnchor="middle"
          dominantBaseline="central"
          style={TERM_STYLE}
        >
          {kinshipTerm}
        </text>
      )}

      <VerticalName
        text={name}
        x={x}
        y={top + TERM_BAND + (NODE_HEIGHT - TERM_BAND) / 2}
        fontSize={FONT_SIZE}
        maxHeight={NAME_ROOM}
      />
    </g>
  )
}

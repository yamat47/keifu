import { tokens } from '../tokens'

type CharAdvanceInput = {
  /** 人名の文字数 */
  length: number
  /** 文字の大きさ。SVG のユーザー座標 */
  fontSize: number
  /** 名前が使ってよい縦の長さ */
  maxHeight: number
}

/**
 * 隣り合う文字の中心どうしの距離。
 *
 * 詰めるのは字送りだけで、fontSize は縮めない
 * → design-system.md「収まらないときは字送りだけを詰める」
 *
 * 1文字が縦に fontSize を占めるものとして計算する。字面の実寸はこれより
 * 上下に少し出るが、その差は書体ごとに違い、書体はブラウザ任せなので測れない。
 * getBBox で測る形にすると props だけで完結しなくなり、同じ家系図が
 * 閲覧者ごとに違う字送りで描かれる。余白は PersonNode が maxHeight に含める
 */
export function charAdvance({ length, fontSize, maxHeight }: CharAdvanceInput): number {
  if (length <= 1) return fontSize

  // 文字1つ入らない持ち分では負になる。詰めきった状態で止める。負のまま返すと
  // 文字の並ぶ向きが上下逆になり、詰まった名前ではなく壊れた名前になる
  const fitted = Math.max(0, (maxHeight - fontSize) / (length - 1))

  return Math.min(fontSize, fitted)
}

type VerticalNameProps = {
  /** 人名。2〜6文字を想定する */
  text: string
  /** 名前全体の中心 */
  x: number
  y: number
  fontSize: number
  /** 名前が使ってよい縦の長さ。収まらない名前は字送りを詰めてここに収める */
  maxHeight: number
}

/**
 * 人名を縦に並べる → design-system.md「縦書きテキスト」
 *
 * 書体と色は属性ではなく style で当てる。理由は tokens.stories.tsx の LineSample にある。
 */
export function VerticalName({ text, x, y, fontSize, maxHeight }: VerticalNameProps) {
  // split('') ではなく spread で分ける。サロゲートペアの漢字を2文字に割らない
  const chars = [...text]
  const advance = charAdvance({ length: chars.length, fontSize, maxHeight })

  return (
    <text
      y={y - (advance * (chars.length - 1)) / 2}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontFamily: tokens.font.display, fontSize, fill: tokens.color.ink }}
    >
      {chars.map((char, index) => (
        // x を毎回指定しないと、tspan は前の文字の右に続けて置かれる。
        // dy だけでは横に流れながら下がる。
        // key は index でよい。人名は並べ替えも挿入もされない
        <tspan key={index} x={x} dy={index === 0 ? 0 : advance}>
          {char}
        </tspan>
      ))}
    </text>
  )
}
